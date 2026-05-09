// AB-only consistency rules engine. Operates on canonical Individual + Policy
// (and optional Customer) records and emits violation rows tagged with rule_id,
// severity, and a human-readable reason. Severity values come from SEVERITY in
// 11_Constants.gs; enum values are configurable in config/ab_only_rules.json so
// admins can correct AgencyBloc's literal strings without code changes.
//
// Rules:
//   1  type ↔ status consistency (Individual)
//   2  no duplicate Part C; no Part C + MedSup or Part C + PDP active combos
//   3  any active policy → individual must be type=client AND status=enrolled
//   4  non-client individual_type → no active policies (pending allowed only for client)
//   5  policy missing signed_by or servicing_agent
//   6  member_id ↔ policy_number identity (must equal for non-Humana; must differ for Humana)
//   7  blank member_id or policy_number on a non-pending policy
//   8  pending policy older than pending_max_days
//   9  date ordering: app_submit < effective < renewal; active/inactive must have submit+effective; inactive must have term_date
//  10  client+enrolled individual missing member_id or insurance_plan — backfill suggestion from active policy

function runAbOnlyRules(individuals, policies, customers) {
  individuals = individuals || [];
  policies    = policies    || [];
  customers   = customers   || [];

  var cfg = getAbOnlyRulesConfig_();
  var out = [];
  out = out.concat(rule1_typeStatusConsistency(individuals, cfg));
  out = out.concat(rule2_policyTypeCombinations(policies, cfg));
  out = out.concat(rule3_activePolicyRequiresClient(policies, individuals, cfg));
  out = out.concat(rule4_nonClientHasNoActive(policies, individuals, cfg));
  out = out.concat(rule5_missingSigningAgents(policies, cfg));
  out = out.concat(rule6_idIdentityRule(policies, cfg));
  out = out.concat(rule7_blankIdentifiers(policies, cfg));
  out = out.concat(rule8_pendingTooLong(policies, cfg));
  out = out.concat(rule9_dateOrdering(policies, cfg));
  out = out.concat(rule10_backfillFromActivePolicy(individuals, policies, customers, cfg));
  return out;
}

function getAbOnlyRulesConfig_() {
  var override = readJsonFromDriveConfig_('ab_only_rules.json');
  return override || (typeof EMBEDDED_AB_ONLY_RULES !== 'undefined' ? EMBEDDED_AB_ONLY_RULES : {});
}

// ---- Rule 1 ----
function rule1_typeStatusConsistency(individuals, cfg) {
  var out = [];
  var typeMap = (cfg && cfg.individual_types) || {};
  var aliases = (cfg && cfg.individual_type_aliases) || {};
  for (var i = 0; i < individuals.length; i++) {
    var rec = individuals[i];
    var typeRaw = String(rec.individual_type || '').trim().toLowerCase();
    if (!typeRaw) continue;
    var type = aliases[typeRaw] || typeRaw;
    var spec = typeMap[type];
    if (!spec) continue; // unknown type — leave alone
    if (spec.allowed_statuses === '*') continue;
    var status = String(rec.status || '').trim().toUpperCase();
    var allowed = (spec.allowed_statuses || []).map(function (s) { return String(s).toUpperCase(); });
    if (allowed.indexOf(status) === -1) {
      out.push(violation_('rule1_type_status', SEVERITY.WARNING,
        "individual type '" + typeRaw + "' should have status in [" + allowed.join(', ') + "] but is '" + (rec.status || '(blank)') + "'",
        rec));
    }
  }
  return out;
}

// ---- Rule 2 ----
//
// Categorizes each ACTIVE policy into a coverage-type "category" (part_c,
// medsup, pdp, aca, apple, chm, non_aca, annuity, life, home, auto) using
// alias lists in ab_only_rules.json. Then walks `forbidden_active_combinations`
// from the config and flags any member whose active policies fall in two
// categories the agency has declared mutually exclusive.
//
// A separate "duplicate Part C" check fires when a single member has more
// than one active Part C policy.

function rule2_policyTypeCombinations(policies, cfg) {
  var out = [];
  var active = upperSet_(cfg.active_status_values);
  var categorySets = buildCategorySets_(cfg);
  var partC = categorySets.part_c || {};

  var byMember = {};
  for (var i = 0; i < policies.length; i++) {
    var p = policies[i];
    if (!active[String(p.status || '').toUpperCase()]) continue;
    var key = p.member_id || (p.first_name + '|' + p.last_name + '|' + p.dob);
    if (!key) continue;
    (byMember[key] = byMember[key] || []).push(p);
  }

  var forbidden = cfg.forbidden_active_combinations || [];

  for (var k in byMember) {
    var bucket = byMember[k];
    var policiesByCategory = classifyBucket_(bucket, categorySets);

    // Duplicate-Part-C check (independent of forbidden_active_combinations).
    var partCBucket = policiesByCategory.part_c || [];
    if (partCBucket.length > 1) {
      for (var b = 0; b < partCBucket.length; b++) {
        out.push(violation_('rule2_duplicate_part_c', SEVERITY.ERROR,
          'member has ' + partCBucket.length + ' active Part C policies (max 1 allowed)',
          partCBucket[b]));
      }
    }

    // Forbidden-combination dispatch.
    for (var f = 0; f < forbidden.length; f++) {
      var rule = forbidden[f];
      var cats = rule.categories || [];
      if (cats.length < 2) continue;
      var allPresent = true;
      for (var c = 0; c < cats.length; c++) {
        if (!(policiesByCategory[cats[c]] && policiesByCategory[cats[c]].length)) {
          allPresent = false;
          break;
        }
      }
      if (!allPresent) continue;
      // Flag every policy that participates in any of the forbidden categories.
      var flagged = {};
      for (var c2 = 0; c2 < cats.length; c2++) {
        var pols = policiesByCategory[cats[c2]] || [];
        for (var pi = 0; pi < pols.length; pi++) {
          if (flagged[pols[pi].__src_row]) continue;
          flagged[pols[pi].__src_row] = true;
          out.push(violation_(rule.id, SEVERITY.ERROR, rule.message, pols[pi]));
        }
      }
    }
  }
  return out;
}

function buildCategorySets_(cfg) {
  var out = {};
  for (var k in cfg) {
    if (k.indexOf('policy_types_') === 0) {
      out[k.substring('policy_types_'.length)] = upperSet_(cfg[k]);
    }
  }
  return out;
}

function classifyBucket_(bucket, categorySets) {
  var out = {};
  for (var i = 0; i < bucket.length; i++) {
    var t = String(bucket[i].policy_type || '').toUpperCase();
    if (!t) continue;
    for (var cat in categorySets) {
      if (categorySets[cat][t]) {
        (out[cat] = out[cat] || []).push(bucket[i]);
      }
    }
  }
  return out;
}

// ---- Rule 3 ----
function rule3_activePolicyRequiresClient(policies, individuals, cfg) {
  var out = [];
  var active = upperSet_(cfg.active_status_values);
  var indByMember = indexIndividualsByKey_(individuals);

  var membersWithActive = {};
  for (var i = 0; i < policies.length; i++) {
    var p = policies[i];
    if (!active[String(p.status || '').toUpperCase()]) continue;
    var key = identityKey_(p);
    if (!key) continue;
    if (!membersWithActive[key]) membersWithActive[key] = p;
  }

  for (var key in membersWithActive) {
    var samplePolicy = membersWithActive[key];
    var ind = indByMember[key];
    if (!ind) {
      out.push(violation_('rule3_active_policy_no_individual', SEVERITY.ERROR,
        'active policy exists but no matching Individual record found',
        samplePolicy));
      continue;
    }
    var typeNorm = normalizeIndividualType_(ind.individual_type, cfg);
    var statusNorm = String(ind.status || '').trim().toUpperCase();
    if (typeNorm !== 'client' || statusNorm !== 'ENROLLED') {
      out.push(violation_('rule3_active_policy_requires_client', SEVERITY.ERROR,
        'active policy requires individual_type=client and status=enrolled, found type=' + (ind.individual_type || '(blank)') + ' status=' + (ind.status || '(blank)'),
        samplePolicy, ind));
    }
  }
  return out;
}

// ---- Rule 4 ----
function rule4_nonClientHasNoActive(policies, individuals, cfg) {
  var out = [];
  var active = upperSet_(cfg.active_status_values);
  var pending = upperSet_(cfg.pending_status_values);

  var policiesByMember = {};
  for (var i = 0; i < policies.length; i++) {
    var p = policies[i];
    var key = identityKey_(p);
    if (!key) continue;
    if (!policiesByMember[key]) policiesByMember[key] = [];
    policiesByMember[key].push(p);
  }

  for (var i2 = 0; i2 < individuals.length; i2++) {
    var ind = individuals[i2];
    var typeNorm = normalizeIndividualType_(ind.individual_type, cfg);
    if (!typeNorm || typeNorm === 'client') continue;
    var key2 = identityKey_(ind);
    var bucket = policiesByMember[key2] || [];
    for (var j = 0; j < bucket.length; j++) {
      var pStatus = String(bucket[j].status || '').toUpperCase();
      if (active[pStatus]) {
        out.push(violation_('rule4_non_client_has_active', SEVERITY.ERROR,
          'individual_type=' + (ind.individual_type || '(blank)') + ' but has an active policy',
          bucket[j], ind));
      } else if (pending[pStatus] && typeNorm !== 'lead') {
        // Pending policies are reasonable for clients (e.g., AEP pending) and leads
        // (during application processing), but not for prospects or x-clients.
        if (typeNorm === 'prospect' || typeNorm === 'x-client') {
          out.push(violation_('rule4_non_client_has_pending', SEVERITY.ERROR,
            'individual_type=' + (ind.individual_type || '(blank)') + ' should not have a pending policy',
            bucket[j], ind));
        }
      }
    }
  }
  return out;
}

// ---- Rule 5 ----
function rule5_missingSigningAgents(policies, cfg) {
  var out = [];
  var inactive = upperSet_(cfg.inactive_status_values);
  for (var i = 0; i < policies.length; i++) {
    var p = policies[i];
    // Skip historical inactive rows — no new signature data is going to land.
    if (inactive[String(p.status || '').toUpperCase()]) continue;
    var missing = [];
    if (!p.signed_by || !String(p.signed_by).trim()) missing.push('signed_by');
    if (!p.servicing_agent || !String(p.servicing_agent).trim()) missing.push('servicing_agent');
    if (missing.length) {
      out.push(violation_('rule5_missing_signing_agents', SEVERITY.WARNING,
        'policy missing: ' + missing.join(', '),
        p));
    }
  }
  return out;
}

// ---- Rule 6 ----
function rule6_idIdentityRule(policies, cfg) {
  var out = [];
  var humanaSet = {};
  (cfg.humana_carrier_keys || []).forEach(function (k) { humanaSet[String(k).toLowerCase()] = true; });
  var pending = upperSet_(cfg.pending_status_values);
  for (var i = 0; i < policies.length; i++) {
    var p = policies[i];
    // Pending policies often haven't been issued an id yet — handled by rule 7.
    if (pending[String(p.status || '').toUpperCase()]) continue;
    var memId = p.member_id ? String(p.member_id).trim().toUpperCase() : '';
    var polNo = p.policy_number ? String(p.policy_number).trim().toUpperCase() : '';
    if (!memId || !polNo) continue; // rule 7 catches these
    var carrierKey = String(p.carrier_normalized || p.carrier || '').toLowerCase();
    var isHumana = !!humanaSet[carrierKey];
    if (isHumana) {
      if (memId === polNo) {
        out.push(violation_('rule6_humana_id_collision', SEVERITY.ERROR,
          'Humana policy must have member_id != policy_number, but both are ' + memId,
          p));
      }
    } else {
      if (memId !== polNo) {
        out.push(violation_('rule6_id_mismatch_non_humana', SEVERITY.ERROR,
          'non-Humana carrier requires member_id == policy_number; got member_id=' + memId + ' policy_number=' + polNo,
          p));
      }
    }
  }
  return out;
}

// ---- Rule 7 ----
function rule7_blankIdentifiers(policies, cfg) {
  var out = [];
  var pending = upperSet_(cfg.pending_status_values);
  for (var i = 0; i < policies.length; i++) {
    var p = policies[i];
    if (pending[String(p.status || '').toUpperCase()]) continue; // pending allowed
    var blank = [];
    if (!p.member_id || !String(p.member_id).trim()) blank.push('member_id');
    if (!p.policy_number || !String(p.policy_number).trim()) blank.push('policy_number');
    if (blank.length) {
      out.push(violation_('rule7_blank_identifiers', SEVERITY.ERROR,
        'non-pending policy missing identifiers: ' + blank.join(', '),
        p));
    }
  }
  return out;
}

// ---- Rule 8 ----
function rule8_pendingTooLong(policies, cfg) {
  var out = [];
  var pending = upperSet_(cfg.pending_status_values);
  var maxDays = Number(cfg.pending_max_days || 15);
  var today = new Date();
  for (var i = 0; i < policies.length; i++) {
    var p = policies[i];
    if (!pending[String(p.status || '').toUpperCase()]) continue;
    if (!p.app_submit_date) continue;
    var sub = parseIsoDate_(p.app_submit_date);
    if (!sub) continue;
    var diff = Math.floor((today - sub) / (24 * 60 * 60 * 1000));
    if (diff > maxDays) {
      out.push(violation_('rule8_pending_too_long', SEVERITY.WARNING,
        'pending for ' + diff + ' days (max ' + maxDays + ') since app_submit_date=' + p.app_submit_date,
        p));
    }
  }
  return out;
}

// ---- Rule 9 ----
function rule9_dateOrdering(policies, cfg) {
  var out = [];
  var active = upperSet_(cfg.active_status_values);
  var pending = upperSet_(cfg.pending_status_values);
  var inactive = upperSet_(cfg.inactive_status_values);
  for (var i = 0; i < policies.length; i++) {
    var p = policies[i];
    var status = String(p.status || '').toUpperCase();
    var sub = p.app_submit_date ? parseIsoDate_(p.app_submit_date) : null;
    var eff = p.effective_date  ? parseIsoDate_(p.effective_date)  : null;
    var ren = p.renewal_date    ? parseIsoDate_(p.renewal_date)    : null;
    var term = p.term_date      ? parseIsoDate_(p.term_date)       : null;

    if ((active[status] || inactive[status]) && !sub) {
      out.push(violation_('rule9_missing_app_submit_date', SEVERITY.ERROR,
        status.toLowerCase() + ' policy missing app_submit_date', p));
    }
    if ((active[status] || inactive[status]) && !eff) {
      out.push(violation_('rule9_missing_effective_date', SEVERITY.ERROR,
        status.toLowerCase() + ' policy missing effective_date', p));
    }
    if (inactive[status] && !term) {
      out.push(violation_('rule9_inactive_missing_term_date', SEVERITY.ERROR,
        'inactive policy missing term_date', p));
    }
    if (sub && eff && sub > eff) {
      out.push(violation_('rule9_submit_after_effective', SEVERITY.ERROR,
        'app_submit_date (' + p.app_submit_date + ') is after effective_date (' + p.effective_date + ')', p));
    }
    if (eff && ren && eff > ren) {
      out.push(violation_('rule9_effective_after_renewal', SEVERITY.ERROR,
        'effective_date (' + p.effective_date + ') is after renewal_date (' + p.renewal_date + ')', p));
    }
    if (eff && term && eff > term) {
      out.push(violation_('rule9_effective_after_term', SEVERITY.ERROR,
        'effective_date (' + p.effective_date + ') is after term_date (' + p.term_date + ')', p));
    }
  }
  return out;
}

// ---- Rule 10 ----
function rule10_backfillFromActivePolicy(individuals, policies, customers, cfg) {
  var out = [];
  var active = upperSet_(cfg.active_status_values);

  var activePoliciesByMember = {};
  var activePoliciesByName = {};
  for (var i = 0; i < policies.length; i++) {
    var p = policies[i];
    if (!active[String(p.status || '').toUpperCase()]) continue;
    var key = identityKey_(p);
    if (key) {
      if (!activePoliciesByMember[key]) activePoliciesByMember[key] = [];
      activePoliciesByMember[key].push(p);
    }
    // Also index by name+DOB so individuals lacking member_id can still be
    // matched to their active policies for backfill suggestions.
    var nk = nameDobKey_(p);
    if (nk) {
      if (!activePoliciesByName[nk]) activePoliciesByName[nk] = [];
      activePoliciesByName[nk].push(p);
    }
  }

  // Customer report acts as a bridge: if the Individual lacks member_id, we
  // can pick it up from the matching Customer row by name+DOB.
  var customerByName = {};
  for (var c = 0; c < customers.length; c++) {
    var cu = customers[c];
    var nk = nameDobKey_(cu);
    if (nk) customerByName[nk] = cu;
  }

  for (var i2 = 0; i2 < individuals.length; i2++) {
    var ind = individuals[i2];
    var typeNorm = normalizeIndividualType_(ind.individual_type, cfg);
    var statusNorm = String(ind.status || '').toUpperCase();
    if (typeNorm !== 'client' || statusNorm !== 'ENROLLED') continue;

    var missingMember = !ind.member_id || !String(ind.member_id).trim();
    var missingPlan = !ind.insurance_plan && !ind.plan_name;
    if (!missingMember && !missingPlan) continue;

    var fillKey = identityKey_(ind);
    var sources = activePoliciesByMember[fillKey] || [];

    // If the individual lacks member_id entirely, fall back to name+DOB
    // matching against active policies, then try the Customer bridge.
    if (!sources.length) {
      var indNk = nameDobKey_(ind);
      if (indNk && activePoliciesByName[indNk]) {
        sources = activePoliciesByName[indNk];
      }
    }
    if (missingMember && !sources.length) {
      var nk2 = nameDobKey_(ind);
      var bridged = nk2 && customerByName[nk2];
      if (bridged && bridged.member_id) {
        sources = activePoliciesByMember[String(bridged.member_id).toUpperCase()] || [];
        if (!ind.__bridge_member_id) ind.__bridge_member_id = bridged.member_id;
      }
    }

    var suggestedMember = '';
    var suggestedPlan = '';
    for (var s = 0; s < sources.length; s++) {
      if (!suggestedMember && sources[s].member_id) suggestedMember = sources[s].member_id;
      if (!suggestedPlan) suggestedPlan = sources[s].insurance_plan || sources[s].plan_name || '';
    }
    if (!suggestedMember && ind.__bridge_member_id) suggestedMember = ind.__bridge_member_id;

    var fields = [];
    if (missingMember) fields.push('member_id');
    if (missingPlan)   fields.push('insurance_plan');
    var suggestion = '';
    if (missingMember && suggestedMember) suggestion += 'member_id=' + suggestedMember;
    if (missingPlan && suggestedPlan) {
      if (suggestion) suggestion += '; ';
      suggestion += 'insurance_plan=' + suggestedPlan;
    }
    out.push(violation_('rule10_backfill_client_enrolled', SEVERITY.WARNING,
      'client+enrolled individual missing ' + fields.join(', ') + (suggestion ? '. Suggested: ' + suggestion : '. No active policy found to backfill from.'),
      ind, null, suggestion || ''));
  }
  return out;
}

// ---- helpers ----

function violation_(ruleId, severity, reason, primary, secondary, suggestedValue) {
  primary = primary || {};
  secondary = secondary || null;
  return {
    type: EXCEPTION_TYPES.AB_RULE_VIOLATION,
    rule_id: ruleId,
    severity: severity,
    reason: reason,
    suggested_value: suggestedValue || '',
    left: primary,
    right: secondary,
    matched_by: 'rule',
    diffs: []
  };
}

function upperSet_(arr) {
  var out = {};
  if (!arr) return out;
  for (var i = 0; i < arr.length; i++) out[String(arr[i]).toUpperCase()] = true;
  return out;
}

function normalizeIndividualType_(raw, cfg) {
  var v = String(raw || '').trim().toLowerCase();
  if (!v) return '';
  var aliases = (cfg && cfg.individual_type_aliases) || {};
  return aliases[v] || v;
}

function identityKey_(rec) {
  if (rec && rec.member_id) return String(rec.member_id).trim().toUpperCase();
  // Fall back to name+DOB so we can still join Individual ↔ Policy when the
  // member_id is missing on the Individual side (rule 10's whole reason).
  return nameDobKey_(rec);
}

function nameDobKey_(rec) {
  if (!rec) return '';
  var ln = (rec.last_name || '').toString().trim().toLowerCase().replace(/[^a-z]/g, '');
  var fn = (rec.first_name || '').toString().trim().toLowerCase().replace(/[^a-z]/g, '');
  var dob = rec.dob || '';
  if (!ln || !dob) return '';
  return ln + '|' + fn + '|' + dob;
}

function indexIndividualsByKey_(individuals) {
  var out = {};
  for (var i = 0; i < individuals.length; i++) {
    var k = identityKey_(individuals[i]);
    if (!k) continue;
    // Prefer the first hit; rule 10 handles the duplicate-individual case if it ever surfaces.
    if (!out[k]) out[k] = individuals[i];
  }
  return out;
}

function parseIsoDate_(iso) {
  if (!iso) return null;
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  var d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
