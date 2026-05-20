// Data Search tool
//
// Takes the AB Individual report (required) + AB Policy report (optional)
// and produces a list of clients matching a set of demographic + coverage
// filters. Output is a fresh Sheet under /Reconciliation Tool/Runs/ with
// two tabs: "Clients" (one row per matching individual with an active-
// policy summary cell) and "Client Policies" (one row per (client, active
// policy) pair so the user can filter by carrier or coverage in the Sheet).
//
// Use cases: build outreach lists, identify DSNP/CSNP candidates, find
// clients in a county/language slice for a campaign.

// ---------- Server endpoints (called from DataSearch.html) ----------

function dataSearch_listOptions(runId) {
  var raw = readScratchRows(runId, 'ab_individual');
  if (!raw || raw.length < 2) {
    return { agents: [], counties: [], cities: [], states: [], languages: [], countries: [], individual_types: [], individual_statuses: [] };
  }
  var inds = normalize('ab_individual', raw);
  return {
    agents:              dsDistinctNonEmpty_(inds, 'servicing_agent'),
    counties:            dsDistinctNonEmpty_(inds, 'county'),
    cities:              dsDistinctNonEmpty_(inds, 'city'),
    states:              dsDistinctNonEmpty_(inds, 'state'),
    languages:           dsDistinctNonEmpty_(inds, 'primary_language'),
    countries:           dsDistinctNonEmpty_(inds, 'country'),
    individual_types:    dsDistinctNonEmpty_(inds, 'individual_type'),
    individual_statuses: dsDistinctNonEmpty_(inds, 'status')
  };
}

function dataSearch_run(runId, criteria) {
  criteria = criteria || {};
  var rawInds = readScratchRows(runId, 'ab_individual');
  if (!rawInds || rawInds.length < 2) {
    throw new Error('Upload the AgencyBloc Individual report first.');
  }
  var inds = normalize('ab_individual', rawInds);

  var pols = [];
  var rawPols = readScratchRows(runId, 'ab_policy');
  if (rawPols && rawPols.length >= 2) {
    pols = normalize('ab_policy', rawPols);
  }

  var result = dataSearchAnalyze_(inds, pols, criteria);
  var written = writeDataSearchWorkbook_(runId, result.clients, result.policyPairs, criteria);

  audit('data_search_run', runId, {
    clients: result.clients.length,
    policy_pairs: result.policyPairs.length,
    filters_active: dsCountActiveFilters_(criteria)
  });

  return {
    url: written.url,
    client_count: result.clients.length,
    policy_pair_count: result.policyPairs.length
  };
}

function dataSearch_loadCriteria() {
  // Surface a default-shape object so the UI knows what fields to render.
  return {
    age_min:               null,
    age_max:               null,
    genders:               [],
    counties:              [],
    cities:                [],
    states:                [],
    zips:                  [],
    languages:             [],
    countries:             [],
    medicaid:              'all',
    is_dsnp:               'all',
    is_csnp:               'all',
    coverage_types:        [],
    carriers:              [],
    individual_types:      [],
    individual_statuses:   [],
    policy_statuses:       [],
    servicing_agents:      []
  };
}

// ---------- Core analysis ----------

function dataSearchAnalyze_(individuals, policies, criteria) {
  var today = new Date();
  var rules = (typeof getAbOnlyRulesConfig_ === 'function') ? getAbOnlyRulesConfig_() : {};
  var activeStatuses  = upperSet_(rules.active_status_values  || ['ACTIVE']);
  var pendingStatuses = upperSet_(rules.pending_status_values || ['PENDING']);

  // Index policies by individual_id for the outer join.
  var policiesByIndId = {};
  for (var p = 0; p < policies.length; p++) {
    var pol = policies[p];
    if (pol.individual_id) {
      var key = String(pol.individual_id).trim();
      (policiesByIndId[key] = policiesByIndId[key] || []).push(pol);
    }
  }

  var clientsOut = [];
  var policyPairsOut = [];

  for (var i = 0; i < individuals.length; i++) {
    var ind = individuals[i];
    var indId = String(ind.individual_id || '').trim();
    var matched = (indId && policiesByIndId[indId]) ? policiesByIndId[indId] : [];
    var activePolicies = matched.filter(function (m) {
      var s = String(m.status || '').toUpperCase();
      return activeStatuses[s] || pendingStatuses[s];
    });

    var derived = dsDeriveClientFields_(ind, activePolicies, today, rules);
    if (!dsPassesFilters_(ind, activePolicies, derived, criteria)) continue;

    clientsOut.push(dsBuildClientRow_(ind, activePolicies, derived));
    for (var ap = 0; ap < activePolicies.length; ap++) {
      policyPairsOut.push(dsBuildClientPolicyRow_(ind, activePolicies[ap], derived));
    }
  }

  return { clients: clientsOut, policyPairs: policyPairsOut };
}

function dsDeriveClientFields_(ind, activePolicies, today, rules) {
  var dob = parseIso_(ind.dob);
  var age = dob ? dsAgeOn_(dob, today) : null;
  var medicaid = !!(ind.medicaid_level || ind.medicaid_number);

  var hasPartC = false, productNames = [];
  for (var i = 0; i < activePolicies.length; i++) {
    var p = activePolicies[i];
    if (isPartCCoverage_(p.policy_type)) hasPartC = true;
    if (p.plan_name) productNames.push(String(p.plan_name).toUpperCase());
  }
  var concatNames = productNames.join(' | ');

  var dsnpAliases = (rules.product_name_substrings && rules.product_name_substrings.dsnp) || ['DUAL SNP', 'DSNP', 'D-SNP'];
  var csnpAliases = (rules.product_name_substrings && rules.product_name_substrings.csnp) || ['CHRONIC SNP', 'CSNP', 'C-SNP'];

  var isDsnp = dsContainsAny_(concatNames, dsnpAliases) || (hasPartC && medicaid);
  var isCsnp = dsContainsAny_(concatNames, csnpAliases);

  return {
    age: age,
    has_medicaid: medicaid,
    has_part_c: hasPartC,
    is_dsnp: isDsnp,
    is_csnp: isCsnp,
    active_policy_count: activePolicies.length
  };
}

function dsPassesFilters_(ind, activePolicies, derived, c) {
  // Age range
  if (dsIsNum_(c.age_min) && (derived.age === null || derived.age < c.age_min)) return false;
  if (dsIsNum_(c.age_max) && (derived.age === null || derived.age > c.age_max)) return false;

  // Demographic single-or-multi-select
  if (dsHasList_(c.genders)             && !dsMatchCI_(ind.gender,           c.genders))             return false;
  if (dsHasList_(c.counties)            && !dsMatchCI_(ind.county,           c.counties))            return false;
  if (dsHasList_(c.zips)                && !dsMatchCI_(ind.zip,              c.zips))                return false;
  if (dsHasList_(c.cities)              && !dsMatchCI_(ind.city,             c.cities))              return false;
  if (dsHasList_(c.states)              && !dsMatchCI_(ind.state,            c.states))              return false;
  if (dsHasList_(c.languages)           && !dsMatchCI_(ind.primary_language, c.languages))           return false;
  if (dsHasList_(c.countries)           && !dsMatchCI_(ind.country,          c.countries))           return false;
  if (dsHasList_(c.individual_types)    && !dsMatchCI_(ind.individual_type,  c.individual_types))    return false;
  if (dsHasList_(c.individual_statuses) && !dsMatchCI_(ind.status,           c.individual_statuses)) return false;
  if (dsHasList_(c.servicing_agents)    && !dsMatchCI_(ind.servicing_agent,  c.servicing_agents))    return false;

  // Medicaid / SNP yes-no-all toggles
  if (c.medicaid === 'yes' && !derived.has_medicaid) return false;
  if (c.medicaid === 'no'  &&  derived.has_medicaid) return false;
  if (c.is_dsnp  === 'yes' && !derived.is_dsnp)      return false;
  if (c.is_dsnp  === 'no'  &&  derived.is_dsnp)      return false;
  if (c.is_csnp  === 'yes' && !derived.is_csnp)      return false;
  if (c.is_csnp  === 'no'  &&  derived.is_csnp)      return false;

  // Policy-based filters: AT LEAST ONE of the client's active policies must
  // satisfy each policy-side filter together.
  if (dsHasList_(c.coverage_types) || dsHasList_(c.carriers) || dsHasList_(c.policy_statuses)) {
    if (!activePolicies.length) return false;
    var anyPolicyMatches = activePolicies.some(function (p) {
      if (dsHasList_(c.coverage_types) && !dsMatchCI_(p.policy_type, c.coverage_types)) return false;
      if (dsHasList_(c.carriers)        && !dsMatchCI_(p.carrier,    c.carriers))        return false;
      if (dsHasList_(c.policy_statuses) && !dsMatchCI_(p.status,     c.policy_statuses)) return false;
      return true;
    });
    if (!anyPolicyMatches) return false;
  }

  return true;
}

// ---------- Row builders ----------

function dsBuildClientRow_(ind, activePolicies, derived) {
  var fullName = [ind.first_name, ind.middle_name, ind.last_name]
    .filter(function (x) { return !!x; }).join(' ').replace(/\s+/g, ' ').trim();
  var phone = ind.phone_cellular || ind.phone_home || ind.phone_business || '';
  var policySummary = activePolicies.map(function (p) {
    return (p.policy_type || '?') + ' @ ' + (p.carrier || '?');
  }).join(' ; ');
  return {
    full_name:              fullName,
    individual_id:          ind.individual_id || '',
    age:                    derived.age,
    dob:                    ind.dob || '',
    gender:                 ind.gender || '',
    phone:                  phone,
    email:                  ind.email || '',
    address:                ind.address || '',
    city:                   ind.city || '',
    state:                  ind.state || '',
    zip:                    ind.zip || '',
    county:                 ind.county || '',
    country:                ind.country || '',
    primary_language:       ind.primary_language || '',
    individual_type:        ind.individual_type || '',
    individual_status:      ind.status || '',
    servicing_agent:        ind.servicing_agent || '',
    medicaid_level:         ind.medicaid_level || '',
    medicaid_id:            ind.medicaid_number || '',
    has_medicaid:           derived.has_medicaid ? 'Yes' : 'No',
    is_dsnp:                derived.is_dsnp ? 'Yes' : 'No',
    is_csnp:                derived.is_csnp ? 'Yes' : 'No',
    active_policy_count:    derived.active_policy_count,
    active_policies_summary: policySummary
  };
}

function dsBuildClientPolicyRow_(ind, policy, derived) {
  var fullName = [ind.first_name, ind.middle_name, ind.last_name]
    .filter(function (x) { return !!x; }).join(' ').replace(/\s+/g, ' ').trim();
  return {
    full_name:           fullName,
    individual_id:       ind.individual_id || '',
    servicing_agent:     ind.servicing_agent || '',
    is_dsnp:             derived.is_dsnp ? 'Yes' : 'No',
    is_csnp:             derived.is_csnp ? 'Yes' : 'No',
    carrier:             policy.carrier || '',
    product_name:        policy.plan_name || '',
    coverage_type:       policy.policy_type || '',
    policy_status:       policy.status || '',
    effective_date:      policy.effective_date || '',
    term_date:           policy.term_date || '',
    member_id:           policy.member_id || '',
    policy_number:       policy.policy_number || '',
    signing_agent_name:  policy.signed_by || '',
    policy_servicing_agent: policy.servicing_agent || ''
  };
}

// ---------- Output workbook ----------

function writeDataSearchWorkbook_(runId, clientRows, policyPairRows, criteria) {
  var folder = getOrCreateRunsFolder_();
  var who = (Session.getActiveUser().getEmail() || 'unknown').split('@')[0];
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'UTC', 'yyyyMMdd_HHmmss');
  var name = 'DataSearch_' + stamp + '_' + who;
  var ss = SpreadsheetApp.create(name);
  var file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  try { file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) {}

  var defaultSheet = ss.getSheets()[0];
  dsWriteClientsTab_(ss, clientRows);
  dsWriteClientPoliciesTab_(ss, policyPairRows);
  dsWriteCriteriaTab_(ss, runId, criteria, clientRows.length, policyPairRows.length);
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  var clients = ss.getSheetByName('Clients');
  if (clients) ss.setActiveSheet(clients);

  appendRunIndex_(runId, ss.getUrl());
  return { url: ss.getUrl(), id: ss.getId() };
}

function dsWriteClientsTab_(ss, rows) {
  var sh = ss.insertSheet('Clients');
  var header = [
    'Full Name', 'Individual ID', 'Age', 'DOB', 'Gender',
    'Phone', 'Email',
    'Address', 'City', 'State', 'Zip', 'County', 'Country', 'Primary Language',
    'Individual Type', 'Individual Status', 'Servicing Agent',
    'Medicaid Level', 'Medicaid ID', 'Has Medicaid',
    'DSNP?', 'CSNP?',
    'Active Policy Count', 'Active Policies Summary'
  ];
  sh.appendRow(header);
  sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  if (!rows.length) return;
  var values = rows.map(function (r) {
    return [
      r.full_name, r.individual_id, r.age, r.dob, r.gender,
      r.phone, r.email,
      r.address, r.city, r.state, r.zip, r.county, r.country, r.primary_language,
      r.individual_type, r.individual_status, r.servicing_agent,
      r.medicaid_level, r.medicaid_id, r.has_medicaid,
      r.is_dsnp, r.is_csnp,
      r.active_policy_count, r.active_policies_summary
    ];
  });
  sh.getRange(2, 1, values.length, header.length).setValues(values);
}

function dsWriteClientPoliciesTab_(ss, rows) {
  var sh = ss.insertSheet('Client Policies');
  var header = [
    'Full Name', 'Individual ID', 'Servicing Agent',
    'DSNP?', 'CSNP?',
    'Carrier', 'Product Name', 'Coverage Type',
    'Policy Status', 'Effective Date', 'Term Date',
    'Member ID', 'Policy Number',
    'Signing Agent Name', 'Policy Servicing Agent'
  ];
  sh.appendRow(header);
  sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  if (!rows.length) return;
  var values = rows.map(function (r) {
    return [
      r.full_name, r.individual_id, r.servicing_agent,
      r.is_dsnp, r.is_csnp,
      r.carrier, r.product_name, r.coverage_type,
      r.policy_status, r.effective_date, r.term_date,
      r.member_id, r.policy_number,
      r.signing_agent_name, r.policy_servicing_agent
    ];
  });
  sh.getRange(2, 1, values.length, header.length).setValues(values);
}

function dsWriteCriteriaTab_(ss, runId, criteria, clientCount, pairCount) {
  var sh = ss.insertSheet('SearchCriteria');
  var rows = [
    ['run_id', runId],
    ['generated', new Date().toString()],
    ['user', Session.getActiveUser().getEmail() || ''],
    ['client_rows', clientCount],
    ['policy_pair_rows', pairCount]
  ];
  Object.keys(criteria || {}).forEach(function (k) {
    var v = criteria[k];
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return;
    rows.push([k, Array.isArray(v) ? v.join(', ') : String(v)]);
  });
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
}

// ---------- Helpers ----------

function dsDistinctNonEmpty_(records, field) {
  var seen = {}, out = [];
  for (var i = 0; i < records.length; i++) {
    var v = String(records[i][field] || '').trim();
    if (!v || seen[v]) continue;
    seen[v] = true;
    out.push(v);
  }
  out.sort();
  return out;
}

function dsAgeOn_(dob, on) {
  var age = on.getFullYear() - dob.getFullYear();
  if (on.getMonth() < dob.getMonth() ||
      (on.getMonth() === dob.getMonth() && on.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function dsMatchCI_(value, list) {
  if (!list || !list.length) return true;
  var v = String(value || '').trim().toUpperCase();
  if (!v) return false;
  for (var i = 0; i < list.length; i++) {
    if (String(list[i]).trim().toUpperCase() === v) return true;
  }
  return false;
}

function dsContainsAny_(haystack, needles) {
  if (!haystack) return false;
  for (var i = 0; i < (needles || []).length; i++) {
    if (haystack.indexOf(String(needles[i]).toUpperCase()) !== -1) return true;
  }
  return false;
}

function dsHasList_(v) { return Array.isArray(v) && v.length > 0; }
function dsIsNum_(v)   { return typeof v === 'number' && !isNaN(v); }

function dsCountActiveFilters_(c) {
  if (!c) return 0;
  var n = 0;
  Object.keys(c).forEach(function (k) {
    var v = c[k];
    if (v === null || v === undefined || v === '' || v === 'all') return;
    if (Array.isArray(v) && !v.length) return;
    n++;
  });
  return n;
}
