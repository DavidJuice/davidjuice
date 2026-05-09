// Medicare IEP Conversion Tracker
//
// Identifies AgencyBloc clients whose 65th birthday falls inside a chosen
// date window, joins them to the Policy report (MBI -> name+DOB+middle),
// and classifies each as "Converted (IEP)" or "Not Converted Yet" based on
// whether they have an Active or Pending Part C policy whose Effective Date
// falls inside their personal Initial Enrollment Period effective range.
//
// IEP effective range for a person turning 65 in month M:
//   Earliest: 1st of M     (applied 1-3 months before)
//   Latest:   1st of M+4   (applied 3 months after birth month)
//   -> half-open interval [start_of_month(M), start_of_month(M+5))
//
// Output:
//   Tab 1 "IEP Clients" — one row per client in window with combined
//                         Individual + Policy fields.
//   Tab 2 "IEP Stats"   — per-agent totals and per-agent-per-month rows
//                         showing total / converted / not-converted /
//                         conversion %, plus an "All Agents" rollup.

// ---------- Server endpoints (called from MedicareIEP.html) ----------

// List Servicing Agents found in the uploaded AB Individual report.
function iep_listAgents(runId) {
  var raw = readScratchRows(runId, 'ab_individual');
  if (!raw || raw.length < 2) return [];
  var inds = normalize('ab_individual', raw);
  var seen = {};
  var agents = [];
  for (var i = 0; i < inds.length; i++) {
    var a = (inds[i].servicing_agent || '').trim();
    if (!a || seen[a]) continue;
    seen[a] = true;
    agents.push(a);
  }
  agents.sort();
  return agents;
}

// Main entry: run analysis and write the output Sheet.
function iep_run(runId, options) {
  options = options || {};
  var windowStart = parseIso_(options.window_start);
  var windowEnd   = parseIso_(options.window_end);
  if (!windowStart || !windowEnd) {
    throw new Error('Pick a valid start and end date for the 65th-birthday window.');
  }
  if (windowEnd < windowStart) {
    throw new Error('End date is before start date.');
  }

  var rawInds = readScratchRows(runId, 'ab_individual');
  var rawPols = readScratchRows(runId, 'ab_policy');
  if (!rawInds || rawInds.length < 2) {
    throw new Error('Upload the AgencyBloc Individual report first.');
  }
  if (!rawPols || rawPols.length < 2) {
    throw new Error('Upload the AgencyBloc Policy report first.');
  }

  var inds = normalize('ab_individual', rawInds);
  var pols = normalize('ab_policy', rawPols);

  var conversionPath = options.conversion_path || 'either';
  var result = iepAnalyze_(inds, pols, windowStart, windowEnd, options.selected_agents || [], conversionPath);
  var yoy = computeIepYoY_(inds, pols, windowStart, windowEnd, conversionPath);
  var written = writeIepWorkbook_(runId, result.rows, result.stats, {
    windowStart: windowStart,
    windowEnd: windowEnd,
    selectedAgents: options.selected_agents || [],
    conversionPath: conversionPath,
    yoy: yoy
  });

  audit('iep_run', runId, {
    window_start: isoOf_(windowStart),
    window_end: isoOf_(windowEnd),
    rows: result.rows.length,
    converted: result.stats.totals.converted,
    not_converted: result.stats.totals.not_converted
  });

  return { url: written.url, rows: result.rows.length, stats: result.stats.totals };
}

// ---------- Core analysis ----------

function iepAnalyze_(individuals, policies, windowStart, windowEnd, selectedAgents, conversionPath) {
  conversionPath = conversionPath || 'either';
  var clients = filterClients_(individuals);
  var sixtyFifthByClient = {};
  var inWindow = [];
  for (var i = 0; i < clients.length; i++) {
    var c = clients[i];
    var dob = parseIso_(c.dob);
    if (!dob) continue;
    var sixtyFifth = addYears_(dob, 65);
    if (sixtyFifth < windowStart || sixtyFifth > windowEnd) continue;
    sixtyFifthByClient[c.__src_row] = sixtyFifth;
    inWindow.push(c);
  }

  if (selectedAgents && selectedAgents.length) {
    var agentSet = {};
    selectedAgents.forEach(function (a) { agentSet[normalizeAgentKey_(a)] = true; });
    inWindow = inWindow.filter(function (c) {
      return agentSet[normalizeAgentKey_(c.servicing_agent)];
    });
  }

  var policyByMBI = {};
  var policyByNDOB = {};
  for (var p = 0; p < policies.length; p++) {
    var pol = policies[p];
    if (pol.mbi) {
      var k = String(pol.mbi).trim().toUpperCase();
      (policyByMBI[k] = policyByMBI[k] || []).push(pol);
    }
    var ndob = nameDOBKey_(pol);
    if (ndob) (policyByNDOB[ndob] = policyByNDOB[ndob] || []).push(pol);
  }

  var rows = [];
  for (var j = 0; j < inWindow.length; j++) {
    var c2 = inWindow[j];
    var sixtyFifth = sixtyFifthByClient[c2.__src_row];
    var matched = matchClientToPolicies_(c2, policyByMBI, policyByNDOB);
    var iepRange = iepEffectiveRange_(sixtyFifth);

    var classification = classifyConversion_(matched, iepRange);
    var verdict = verdictFromClassification_(classification, conversionPath);

    var displayPolicy = pickDisplayPolicy_(matched, classification, verdict);
    rows.push(buildClientRow_(c2, sixtyFifth, displayPolicy, verdict));
  }

  rows.sort(function (a, b) {
    return (a.sixty_fifth_birthday || '').localeCompare(b.sixty_fifth_birthday || '');
  });

  var stats = buildIepStats_(rows, windowStart, windowEnd);
  return { rows: rows, stats: stats };
}

// ---- Conversion classification ----
//
// Inspects every policy joined to a client and decides whether they have
// each Medicare-conversion path active or pending with an Effective Date
// inside their personal IEP-effective range. The final "Converted" verdict
// depends on the user-selected conversion_path mode:
//
//   part_c       : Part C alone is enough.
//   medsup_pdp   : MedSup AND PDP must both be present.
//   either       : Part C OR (MedSup AND PDP).            (default)
//   any_coverage : any Active/Pending coverage in the IEP range counts;
//                  surfaces unusual paths (e.g. just MedSup, just PDP,
//                  Apple/ACA renewals around the birthday) so the agent
//                  can review and reclassify.
//
// `path_label` records which path was matched; it lands in the Conversion
// Path column on the Clients tab so the user can sort/filter the Sheet.

function classifyConversion_(matched, iepRange) {
  var partC = false, medsup = false, pdp = false, anyOther = false;
  var partCPolicy = null, medsupPolicy = null, pdpPolicy = null, otherPolicy = null;
  for (var i = 0; i < matched.length; i++) {
    var p = matched[i];
    if (!isActiveOrPendingStatus_(p.status)) continue;
    var eff = parseIso_(p.effective_date);
    if (!eff || eff < iepRange.start || eff >= iepRange.endExcl) continue;

    if (isPartCCoverage_(p.policy_type)) {
      partC = true;
      if (!partCPolicy) partCPolicy = p;
    } else if (isMedSupCoverage_(p.policy_type)) {
      medsup = true;
      if (!medsupPolicy) medsupPolicy = p;
    } else if (isPDPCoverage_(p.policy_type)) {
      pdp = true;
      if (!pdpPolicy) pdpPolicy = p;
    } else {
      anyOther = true;
      if (!otherPolicy) otherPolicy = p;
    }
  }
  return {
    partC: partC,
    medsup: medsup,
    pdp: pdp,
    medsupPlusPdp: medsup && pdp,
    anyOther: anyOther,
    partCPolicy: partCPolicy,
    medsupPolicy: medsupPolicy,
    pdpPolicy: pdpPolicy,
    otherPolicy: otherPolicy
  };
}

function verdictFromClassification_(c, mode) {
  var converted = false, path = '';
  switch (mode) {
    case 'part_c':
      converted = c.partC;
      path = converted ? 'Part C' : '';
      break;
    case 'medsup_pdp':
      converted = c.medsupPlusPdp;
      path = converted ? 'MedSup+PDP' : '';
      break;
    case 'any_coverage':
      converted = c.partC || c.medsupPlusPdp || c.medsup || c.pdp || c.anyOther;
      if (c.partC && c.medsupPlusPdp) path = 'Both';
      else if (c.partC) path = 'Part C';
      else if (c.medsupPlusPdp) path = 'MedSup+PDP';
      else if (c.medsup || c.pdp) path = 'Partial (MedSup or PDP)';
      else if (c.anyOther) path = 'Other';
      else path = '';
      break;
    case 'either':
    default:
      if (c.partC && c.medsupPlusPdp) { converted = true; path = 'Both'; }
      else if (c.partC) { converted = true; path = 'Part C'; }
      else if (c.medsupPlusPdp) { converted = true; path = 'MedSup+PDP'; }
      else { converted = false; path = ''; }
      break;
  }
  return {
    converted: converted,
    path: path,
    status: converted ? ('Converted (' + path + ')') : 'Not Converted Yet'
  };
}

function pickDisplayPolicy_(matched, c, verdict) {
  if (verdict.converted) {
    if (verdict.path === 'Part C' || verdict.path === 'Both') return c.partCPolicy || c.medsupPolicy;
    if (verdict.path === 'MedSup+PDP') return c.medsupPolicy || c.pdpPolicy;
    if (verdict.path === 'Partial (MedSup or PDP)') return c.medsupPolicy || c.pdpPolicy;
    if (verdict.path === 'Other') return c.otherPolicy;
  }
  // Fallbacks for "Not Converted Yet" rows so the user still sees the
  // most-relevant policy attached to the client.
  return c.partCPolicy || c.medsupPolicy || c.pdpPolicy || c.otherPolicy
    || matched.filter(function (p) { return isActiveOrPendingStatus_(p.status); })[0]
    || matched[0] || null;
}

function isMedSupCoverage_(coverageType) {
  if (!coverageType) return false;
  var u = String(coverageType).toUpperCase();
  var rules = (typeof getAbOnlyRulesConfig_ === 'function') ? getAbOnlyRulesConfig_() : {};
  var aliases = (rules.policy_types_medsup || ['MEDSUP', 'MEDICARE SUPPLEMENT', 'SUPPLEMENT', 'MED SUP']);
  for (var i = 0; i < aliases.length; i++) {
    if (u.indexOf(String(aliases[i]).toUpperCase()) !== -1) return true;
  }
  return false;
}

function isPDPCoverage_(coverageType) {
  if (!coverageType) return false;
  var u = String(coverageType).toUpperCase();
  var rules = (typeof getAbOnlyRulesConfig_ === 'function') ? getAbOnlyRulesConfig_() : {};
  var aliases = (rules.policy_types_pdp || ['PDP', 'PART D', 'PRESCRIPTION DRUG']);
  for (var i = 0; i < aliases.length; i++) {
    if (u.indexOf(String(aliases[i]).toUpperCase()) !== -1) return true;
  }
  return false;
}

// ---------- Year-over-year ----------
//
// For each month in the chosen window, compute "this year" totals and the
// totals for the same month one year prior, using the same Individual +
// Policy data set. Drives the IEP YoY tab so agents can see whether
// conversion rates are improving compared to the same month last year.

function computeIepYoY_(individuals, policies, windowStart, windowEnd, conversionPath) {
  conversionPath = conversionPath || 'either';
  var months = monthsBetween_(windowStart, windowEnd);
  var rows = [];
  for (var i = 0; i < months.length; i++) {
    var thisKey = months[i];
    var lastKey = (Number(thisKey.substring(0, 4)) - 1) + thisKey.substring(4);
    var thisCohort = analyzeMonthForYoY_(individuals, policies, thisKey, conversionPath);
    var lastCohort = analyzeMonthForYoY_(individuals, policies, lastKey, conversionPath);
    rows.push({
      month: thisKey,
      this_year_total:     thisCohort.total,
      this_year_converted: thisCohort.converted,
      this_year_pct:       thisCohort.total ? (thisCohort.converted / thisCohort.total) : 0,
      last_year_month:     lastKey,
      last_year_total:     lastCohort.total,
      last_year_converted: lastCohort.converted,
      last_year_pct:       lastCohort.total ? (lastCohort.converted / lastCohort.total) : 0
    });
  }
  return rows;
}

function analyzeMonthForYoY_(individuals, policies, monthKey, conversionPath) {
  var year  = Number(monthKey.substring(0, 4));
  var month = Number(monthKey.substring(5, 7)) - 1;
  var start = new Date(year, month, 1);
  var end   = new Date(year, month + 1, 0); // last day of month
  var sub = iepAnalyze_(individuals, policies, start, end, [], conversionPath);
  return {
    total: sub.stats.totals.total,
    converted: sub.stats.totals.converted
  };
}

function filterClients_(individuals) {
  var out = [];
  for (var i = 0; i < individuals.length; i++) {
    var t = String(individuals[i].individual_type || '').trim().toLowerCase();
    if (t === 'client') out.push(individuals[i]);
  }
  return out;
}

function matchClientToPolicies_(client, policyByMBI, policyByNDOB) {
  var hits = [];
  var seen = {};
  function add(p) {
    if (seen[p.__src_row]) return;
    seen[p.__src_row] = true;
    hits.push(p);
  }
  if (client.mbi) {
    var k = String(client.mbi).trim().toUpperCase();
    (policyByMBI[k] || []).forEach(add);
  }
  var ndob = nameDOBKey_(client);
  if (ndob) (policyByNDOB[ndob] || []).forEach(add);
  return hits;
}

function nameDOBKey_(rec) {
  var ln = normLower_(rec.last_name);
  var fn = normLower_(rec.first_name);
  var dob = rec.dob || '';
  if (!ln || !fn || !dob) return null;
  var mn = normLower_(rec.middle_name);
  return ln + '|' + fn + '|' + (mn ? mn.charAt(0) : '') + '|' + dob;
}

function normLower_(s) {
  if (!s) return '';
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeAgentKey_(s) {
  return String(s || '').trim().toUpperCase();
}

function isActiveOrPendingStatus_(s) {
  var u = String(s || '').toUpperCase();
  return u === 'ACTIVE' || u === 'PENDING';
}

function isPartCCoverage_(coverageType) {
  if (!coverageType) return false;
  var u = String(coverageType).toUpperCase();
  var rules = (typeof getAbOnlyRulesConfig_ === 'function') ? getAbOnlyRulesConfig_() : {};
  var aliases = (rules.policy_types_part_c || ['PART C', 'MAPD', 'MEDICARE ADVANTAGE', 'MA', 'MA-PD']);
  for (var i = 0; i < aliases.length; i++) {
    if (u.indexOf(String(aliases[i]).toUpperCase()) !== -1) return true;
  }
  return false;
}

function isAcaCoverage_(coverageType) {
  if (!coverageType) return false;
  var u = String(coverageType).toUpperCase();
  return u.indexOf('ACA') !== -1 || u.indexOf('INDV. HEALTH') !== -1 || u.indexOf('INDIVIDUAL HEALTH') !== -1;
}

function memberIdForDisplay_(policyRow) {
  if (!policyRow) return '';
  if (isAcaCoverage_(policyRow.policy_type)) {
    return policyRow.wahpf_app_id || policyRow.member_id || '';
  }
  return policyRow.member_id || '';
}

function buildClientRow_(client, sixtyFifth, policy, verdict) {
  var fullName = [client.first_name, client.middle_name, client.last_name]
    .filter(function (x) { return !!x; }).join(' ').replace(/\s+/g, ' ').trim();
  var phone = client.phone_cellular || client.phone_home || client.phone_business || '';
  return {
    full_name:              fullName,
    individual_id:          client.individual_id || '',
    gender:                 client.gender || '',
    dob:                    client.dob || '',
    sixty_fifth_birthday:   isoOf_(sixtyFifth),
    phone:                  phone,
    email:                  client.email || '',
    servicing_agent:        client.servicing_agent || '',
    individual_type:        client.individual_type || '',
    individual_status:      client.status || '',
    carrier_name:           policy ? (policy.carrier || '') : '',
    product_name:           policy ? (policy.plan_name || '') : '',
    coverage_type:          policy ? (policy.policy_type || '') : '',
    app_submit_date:        policy ? (policy.app_submit_date || '') : '',
    effective_date:         policy ? (policy.effective_date || '') : '',
    signing_agent_name:     policy ? (policy.signed_by || '') : '',
    policy_servicing_agent: policy ? (policy.servicing_agent || '') : '',
    member_id:              memberIdForDisplay_(policy),
    policy_number:          policy ? (policy.policy_number || '') : '',
    conversion_status:      verdict.status,
    conversion_path:        verdict.path
  };
}

// ---------- IEP date math ----------

function iepEffectiveRange_(sixtyFifthDate) {
  var start = new Date(sixtyFifthDate.getFullYear(), sixtyFifthDate.getMonth(), 1);
  var endExcl = new Date(sixtyFifthDate.getFullYear(), sixtyFifthDate.getMonth() + 5, 1);
  return { start: start, endExcl: endExcl };
}

function parseIso_(s) {
  if (!s) return null;
  if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function isoOf_(d) {
  if (!d) return '';
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var dd = d.getDate();
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
}

function addYears_(d, n) {
  return new Date(d.getFullYear() + n, d.getMonth(), d.getDate());
}

function addMonths_(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

function startOfMonth_(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ---------- Stats ----------

function buildIepStats_(rows, windowStart, windowEnd) {
  var months = monthsBetween_(windowStart, windowEnd);
  var byAgent = {};
  var totals  = { total: 0, converted: 0, not_converted: 0 };

  function bumpAgent(agent, monthKey, converted) {
    var a = byAgent[agent] || (byAgent[agent] = {
      agent: agent,
      total: 0, converted: 0, not_converted: 0,
      monthly: {}
    });
    a.total++;
    a[converted ? 'converted' : 'not_converted']++;
    var m = a.monthly[monthKey] || (a.monthly[monthKey] = { total: 0, converted: 0, not_converted: 0 });
    m.total++;
    m[converted ? 'converted' : 'not_converted']++;
  }

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var monthKey = (r.sixty_fifth_birthday || '').substring(0, 7) || '(unknown)';
    var converted = String(r.conversion_status || '').indexOf('Converted') === 0;
    var agent = (r.servicing_agent || '(unassigned)').trim() || '(unassigned)';
    totals.total++;
    totals[converted ? 'converted' : 'not_converted']++;
    bumpAgent(agent, monthKey, converted);
  }

  var agentList = Object.keys(byAgent).map(function (k) { return byAgent[k]; });
  agentList.sort(function (a, b) { return a.agent.localeCompare(b.agent); });

  return { totals: totals, agents: agentList, months: months };
}

function monthsBetween_(start, end) {
  var out = [];
  var cur = new Date(start.getFullYear(), start.getMonth(), 1);
  var stop = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= stop) {
    out.push(isoOf_(cur).substring(0, 7));
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return out;
}

// ---------- Output workbook ----------

function writeIepWorkbook_(runId, rows, stats, opts) {
  var folder = getOrCreateRunsFolder_();
  var who = (Session.getActiveUser().getEmail() || 'unknown').split('@')[0];
  var name = 'IEP_' + runId + '_' + who;
  var ss = SpreadsheetApp.create(name);
  var file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  try { file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) {}

  var defaultSheet = ss.getSheets()[0];
  writeIepClientsTab_(ss, rows);
  writeIepStatsTab_(ss, stats, opts);
  if (opts.yoy && opts.yoy.length) writeIepYoYTab_(ss, opts.yoy);
  writeIepMetadataTab_(ss, runId, rows.length, opts);
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  var clients = ss.getSheetByName('IEP Clients');
  if (clients) ss.setActiveSheet(clients);

  appendRunIndex_(runId, ss.getUrl());
  return { url: ss.getUrl(), id: ss.getId() };
}

function writeIepClientsTab_(ss, rows) {
  var sh = ss.insertSheet('IEP Clients');
  var header = [
    'Full Name', 'Individual ID', 'Gender', 'DOB', '65th Birthday',
    'Phone', 'Email', 'Servicing Agent', 'Individual Type', 'Individual Status',
    'Carrier Name', 'Product Name', 'Coverage Type',
    'App Submit Date', 'Effective Date',
    'Signing Agent Name', 'Policy Servicing Agent',
    'Member ID', 'Policy Number',
    'Conversion Status', 'Conversion Path'
  ];
  sh.appendRow(header);
  sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  if (!rows.length) return;
  var values = rows.map(function (r) {
    return [
      r.full_name, r.individual_id, r.gender, r.dob, r.sixty_fifth_birthday,
      r.phone, r.email, r.servicing_agent, r.individual_type, r.individual_status,
      r.carrier_name, r.product_name, r.coverage_type,
      r.app_submit_date, r.effective_date,
      r.signing_agent_name, r.policy_servicing_agent,
      r.member_id, r.policy_number,
      r.conversion_status, r.conversion_path
    ];
  });
  sh.getRange(2, 1, values.length, header.length).setValues(values);
}

function writeIepStatsTab_(ss, stats, opts) {
  var sh = ss.insertSheet('IEP Stats');
  var row = 1;
  sh.getRange(row, 1).setValue('Window').setFontWeight('bold');
  sh.getRange(row, 2).setValue(isoOf_(opts.windowStart) + '  →  ' + isoOf_(opts.windowEnd));
  row++;
  sh.getRange(row, 1).setValue('Conversion path').setFontWeight('bold');
  sh.getRange(row, 2).setValue(prettyConversionPath_(opts.conversionPath));
  row += 2;

  sh.getRange(row, 1).setValue('Totals (entire window)').setFontWeight('bold');
  row++;
  sh.getRange(row, 1, 1, 5).setValues([['Agent', 'Total in Window', 'Converted (IEP)', 'Not Converted', 'Conversion %']]).setFontWeight('bold');
  row++;
  var allRow = ['All Agents', stats.totals.total, stats.totals.converted, stats.totals.not_converted, pctOf_(stats.totals.converted, stats.totals.total)];
  sh.getRange(row, 1, 1, 5).setValues([allRow]).setFontWeight('bold');
  row++;
  for (var i = 0; i < stats.agents.length; i++) {
    var a = stats.agents[i];
    sh.getRange(row, 1, 1, 5).setValues([[a.agent, a.total, a.converted, a.not_converted, pctOf_(a.converted, a.total)]]);
    row++;
  }

  row += 1;
  sh.getRange(row, 1).setValue('Monthly breakdown').setFontWeight('bold');
  row++;
  sh.getRange(row, 1, 1, 6).setValues([['Agent', 'Birthday Month', 'Total', 'Converted (IEP)', 'Not Converted', 'Conversion %']]).setFontWeight('bold');
  row++;
  // All-Agents monthly
  var monthlyAll = aggregateAgentsByMonth_(stats.agents, stats.months);
  for (var m = 0; m < stats.months.length; m++) {
    var mk = stats.months[m];
    var mt = monthlyAll[mk] || { total: 0, converted: 0, not_converted: 0 };
    sh.getRange(row, 1, 1, 6).setValues([['All Agents', mk, mt.total, mt.converted, mt.not_converted, pctOf_(mt.converted, mt.total)]]).setFontWeight('bold');
    row++;
  }
  for (var ai = 0; ai < stats.agents.length; ai++) {
    var ag = stats.agents[ai];
    for (var mi = 0; mi < stats.months.length; mi++) {
      var key = stats.months[mi];
      var data = ag.monthly[key] || { total: 0, converted: 0, not_converted: 0 };
      if (data.total === 0) continue;
      sh.getRange(row, 1, 1, 6).setValues([[ag.agent, key, data.total, data.converted, data.not_converted, pctOf_(data.converted, data.total)]]);
      row++;
    }
  }
  sh.setFrozenRows(1);
}

function writeIepYoYTab_(ss, yoy) {
  var sh = ss.insertSheet('IEP YoY');
  sh.getRange(1, 1).setValue('Year-over-year conversion comparison').setFontWeight('bold');
  var header = ['Month', 'Total (this yr)', 'Converted', 'Conv. %', 'Same month last yr', 'Total (last yr)', 'Converted', 'Conv. %', 'YoY Δ %'];
  sh.getRange(2, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (!yoy.length) {
    sh.getRange(3, 1).setValue('No data in window.');
    return;
  }
  var values = yoy.map(function (r) {
    var deltaPct = (r.this_year_pct - r.last_year_pct) * 100;
    return [
      r.month,
      r.this_year_total, r.this_year_converted, formatPct_(r.this_year_pct),
      r.last_year_month,
      r.last_year_total, r.last_year_converted, formatPct_(r.last_year_pct),
      (deltaPct >= 0 ? '+' : '') + (Math.round(deltaPct * 10) / 10) + ' pp'
    ];
  });
  sh.getRange(3, 1, values.length, header.length).setValues(values);
  sh.setFrozenRows(2);
}

function formatPct_(frac) {
  return Math.round(frac * 1000) / 10 + '%';
}

function prettyConversionPath_(path) {
  switch (path) {
    case 'part_c':       return 'Part C only';
    case 'medsup_pdp':   return 'MedSup + PDP only';
    case 'any_coverage': return 'Any active/pending coverage in IEP window';
    case 'either':
    default:             return 'Either Part C or MedSup+PDP';
  }
}

function writeIepMetadataTab_(ss, runId, rowCount, opts) {
  var sh = ss.insertSheet('RunMetadata');
  var rows = [
    ['run_id', runId],
    ['generated', new Date().toString()],
    ['user', Session.getActiveUser().getEmail() || ''],
    ['window_start', isoOf_(opts.windowStart)],
    ['window_end', isoOf_(opts.windowEnd)],
    ['conversion_path', prettyConversionPath_(opts.conversionPath)],
    ['selected_agents', (opts.selectedAgents || []).join(', ') || '(all)'],
    ['client_rows', rowCount]
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
}

function aggregateAgentsByMonth_(agents, months) {
  var out = {};
  for (var i = 0; i < months.length; i++) out[months[i]] = { total: 0, converted: 0, not_converted: 0 };
  for (var a = 0; a < agents.length; a++) {
    var ag = agents[a];
    for (var k in ag.monthly) {
      if (!out[k]) out[k] = { total: 0, converted: 0, not_converted: 0 };
      out[k].total         += ag.monthly[k].total;
      out[k].converted     += ag.monthly[k].converted;
      out[k].not_converted += ag.monthly[k].not_converted;
    }
  }
  return out;
}

function pctOf_(num, denom) {
  if (!denom) return '0%';
  return Math.round((num / denom) * 1000) / 10 + '%';
}

// ---------- Settings ----------

function getIepSettings_() {
  var override = readJsonFromDriveConfig_('iep_settings.json');
  return override || (typeof EMBEDDED_IEP_SETTINGS !== 'undefined' ? EMBEDDED_IEP_SETTINGS : {});
}

function iep_getSettings() {
  var s = getIepSettings_();
  return {
    folder_configured: !!s.report_folder_id,
    recipient_count: (s.recipient_emails || []).length,
    monthly_schedule_enabled: !!s.monthly_schedule_enabled,
    monthly_window_months_ahead: s.monthly_window_months_ahead || 1,
    monthly_window_months_back: s.monthly_window_months_back || 0
  };
}

// Returns the current recipient_emails array. The UI uses this to populate
// the editor textarea.
function iep_getRecipients() {
  var s = getIepSettings_();
  return s.recipient_emails || [];
}

// Persists a new recipient list to the Drive override at
// /Reconciliation Tool/Config/iep_settings.json. Performs a basic
// well-formed-email check on each entry.
function iep_setRecipients(emails) {
  var clean = [];
  var seen = {};
  for (var i = 0; i < (emails || []).length; i++) {
    var addr = String(emails[i] || '').trim();
    if (!addr) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      throw new Error('Not a valid email: ' + addr);
    }
    var key = addr.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    clean.push(addr);
  }
  var current = getIepSettings_();
  var merged = {};
  for (var k in current) merged[k] = current[k];
  merged.recipient_emails = clean;
  writeJsonToDriveConfig_('iep_settings.json', merged);
  audit('iep_recipients_updated', '', { count: clean.length });
  return clean;
}

// ---------- Drive-folder source ----------

function iep_runFromFolder(options) {
  options = options || {};
  var windowStart = parseIso_(options.window_start);
  var windowEnd   = parseIso_(options.window_end);
  if (!windowStart || !windowEnd) {
    throw new Error('Pick a valid start and end date for the 65th-birthday window.');
  }
  if (windowEnd < windowStart) throw new Error('End date is before start date.');

  var settings = getIepSettings_();
  if (!settings.report_folder_id) {
    throw new Error('No IEP report folder configured. Set "report_folder_id" in /Reconciliation Tool/Config/iep_settings.json.');
  }

  var folder = DriveApp.getFolderById(settings.report_folder_id);
  var indRaw = loadLatestCsvFromFolder_(folder, settings.individual_filename_pattern || 'individualreport');
  var polRaw = loadLatestCsvFromFolder_(folder, settings.policy_filename_pattern || 'PolicyIndividualsGroups');
  if (!indRaw) throw new Error('No Individual report (matching "' + (settings.individual_filename_pattern || 'individualreport') + '") found in the IEP folder.');
  if (!polRaw) throw new Error('No Policy report (matching "' + (settings.policy_filename_pattern || 'PolicyIndividualsGroups') + '") found in the IEP folder.');

  var inds = normalize('ab_individual', indRaw);
  var pols = normalize('ab_policy', polRaw);
  var conversionPath = options.conversion_path || 'either';
  var result = iepAnalyze_(inds, pols, windowStart, windowEnd, options.selected_agents || [], conversionPath);
  var yoy = computeIepYoY_(inds, pols, windowStart, windowEnd, conversionPath);

  var runId = 'iep_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'UTC', 'yyyyMMdd_HHmmss');
  var written = writeIepWorkbook_(runId, result.rows, result.stats, {
    windowStart: windowStart,
    windowEnd: windowEnd,
    selectedAgents: options.selected_agents || [],
    conversionPath: conversionPath,
    yoy: yoy
  });

  audit('iep_run_from_folder', runId, {
    window_start: isoOf_(windowStart),
    window_end: isoOf_(windowEnd),
    rows: result.rows.length,
    converted: result.stats.totals.converted
  });

  return { url: written.url, runId: runId, rows: result.rows.length, stats: result.stats.totals };
}

function loadLatestCsvFromFolder_(folder, pattern) {
  var pat = String(pattern || '').toLowerCase();
  var files = folder.getFiles();
  var latest = null;
  while (files.hasNext()) {
    var f = files.next();
    var n = f.getName().toLowerCase();
    if (pat && n.indexOf(pat) === -1) continue;
    if (!latest || f.getDateCreated().getTime() > latest.getDateCreated().getTime()) {
      latest = f;
    }
  }
  if (!latest) return null;
  var text = latest.getBlob().getDataAsString('UTF-8');
  return parseCsv(text);
}

// ---------- Email distribution ----------

function iep_emailReport(sheetUrl, recipients) {
  var settings = getIepSettings_();
  var to = (recipients && recipients.length) ? recipients : (settings.recipient_emails || []);
  if (!to.length) {
    throw new Error('No recipients configured. Add emails to /Reconciliation Tool/Config/iep_settings.json (recipient_emails) or pass an explicit list.');
  }
  if (!sheetUrl) throw new Error('No IEP report URL provided.');

  var subject = 'Medicare IEP Tracker — ' + isoOf_(new Date());
  var body =
    'The latest Medicare IEP conversion report is available:\n\n' +
    sheetUrl + '\n\n' +
    'This email is sent inside our Google Workspace BAA. Do not forward outside the agency.';

  var attachments = [];
  if (settings.send_csv_attachment !== false) {
    var csv = iepClientsCsvFromSheet_(sheetUrl);
    if (csv) {
      attachments.push(Utilities.newBlob(csv, 'text/csv', 'iep_clients.csv'));
    }
  }

  for (var i = 0; i < to.length; i++) {
    GmailApp.sendEmail(to[i], subject, body, { attachments: attachments });
  }

  audit('iep_emailed', '', { recipients: to.length, sheet: sheetUrl });
  return { sent: to.length };
}

function iepClientsCsvFromSheet_(sheetUrl) {
  var m = String(sheetUrl).match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  var ss = SpreadsheetApp.openById(m[1]);
  var sh = ss.getSheetByName('IEP Clients');
  if (!sh) return null;
  var values = sh.getDataRange().getValues();
  return values.map(function (row) {
    return row.map(function (cell) {
      var s = (cell === null || cell === undefined) ? '' : String(cell);
      if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',');
  }).join('\n');
}

// ---------- Monthly scheduled trigger ----------
//
// Schedule: daily at 7am. The handler bails unless today is the last day of
// the month and `monthly_schedule_enabled` is true. Daily firing avoids
// edge cases with .onMonthDay() in months that have fewer days.

var IEP_MONTHLY_TRIGGER = 'iepMonthlyTick';

function installIepMonthly() {
  uninstallIepMonthly();
  ScriptApp.newTrigger(IEP_MONTHLY_TRIGGER)
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  audit('iep_monthly_installed', '', {});
}

function uninstallIepMonthly() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === IEP_MONTHLY_TRIGGER) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function iepMonthlyTick() {
  var settings = getIepSettings_();
  if (!settings.monthly_schedule_enabled) {
    safeLog('iep_monthly_skipped', { reason: 'monthly_schedule_enabled is false' });
    return;
  }
  var today = new Date();
  var lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  if (today.getDate() !== lastDay) {
    safeLog('iep_monthly_skipped', { reason: 'not last day of month', day: today.getDate(), lastDay: lastDay });
    return;
  }

  var monthsAhead = Number(settings.monthly_window_months_ahead) || 1;
  var monthsBack  = Number(settings.monthly_window_months_back)  || 0;
  var start = addMonths_(today, -monthsBack);
  var end   = addMonths_(today, monthsAhead);

  try {
    var res = iep_runFromFolder({
      window_start: isoOf_(start),
      window_end: isoOf_(end),
      selected_agents: [],
      conversion_path: settings.conversion_path || 'either'
    });
    iep_emailReport(res.url, settings.recipient_emails || []);
    audit('iep_monthly_sent', res.runId, { rows: res.rows });
  } catch (e) {
    safeLog('iep_monthly_failed', { error: String(e && e.message || e) });
    throw e;
  }
}
