// Phase 2 tests — match-key reorder, AB-only rules, BoB-source-of-truth, MBI gate.

function test_match_key_priority_mbi_first() {
  // Two records with the same MBI but different member_ids and names.
  // The MBI-first ladder must match them; without it, only_in_AB would fire.
  var left  = [{ mbi: 'M0001', member_id: 'A1', last_name: 'Smith', first_name: 'Jo', dob: '1950-01-01', __src_row: 1 }];
  var right = [{ mbi: 'M0001', member_id: 'B9', last_name: 'Smyth', first_name: 'Joseph', dob: '1950-02-02', __src_row: 1 }];
  var exc = matchAndCompare(left, right, ['mbi', 'member_id', 'name_dob'], [], 'unit', false);
  var onlyAB = exc.filter(function (e) { return e.type === 'only_in_AB'; });
  assertEqual(onlyAB.length, 0, 'MBI-first ladder must match across differing names/ids');
}

function test_match_humana_skip_policy_number() {
  // AB and Humana intentionally hold different policy numbers; matching must
  // succeed via member_id when policy_number is in skip_keys.
  var left  = [{ member_id: 'M1', policy_number: 'AB-123', last_name: 'Doe', first_name: 'Jane', dob: '1950-01-01', __src_row: 1 }];
  var right = [{ member_id: 'M1', policy_number: 'HUM-999', last_name: 'Doe', first_name: 'Jane', dob: '1950-01-01', __src_row: 1 }];
  var exc = matchAndCompare(left, right, ['mbi', 'member_id', 'policy_number', 'name_dob'], [], 'unit', false, ['policy_number']);
  var onlyAB = exc.filter(function (e) { return e.type === 'only_in_AB'; });
  assertEqual(onlyAB.length, 0, 'with policy_number skipped, member_id should still match');
}

function test_name_dob_match_with_middle_name_optional() {
  // Middle name is intentionally NOT in the exact key — last+first+DOB suffices.
  var left  = [{ first_name: 'Jane', middle_name: 'A',  last_name: 'Doe', dob: '1950-01-01', __src_row: 1 }];
  var right = [{ first_name: 'Jane', middle_name: '',   last_name: 'Doe', dob: '1950-01-01', __src_row: 1 }];
  var exc = matchAndCompare(left, right, ['name_dob'], [], 'unit', false);
  var onlyAB = exc.filter(function (e) { return e.type === 'only_in_AB'; });
  assertEqual(onlyAB.length, 0, 'name_dob must still match when one side lacks middle_name');
}

function test_normalize_carrier_humana_wa() {
  assertEqual(normalizeCarrierName_('Humana WA'), 'humana');
  assertEqual(normalizeCarrierName_('humana washington'), 'humana');
  assertEqual(normalizeCarrierName_('UnitedHealthcare'), 'uhc');
  assertEqual(normalizeCarrierName_('UHC'), 'uhc');
  assertEqual(normalizeCarrierName_(''), '');
}

// ---- AB-only rule tests ----

function abRulesTestCfg_() {
  return {
    individual_types: {
      'lead':      { allowed_statuses: ['NOT CONTACTED YET'] },
      'prospect':  { allowed_statuses: ['CONTACTED', 'MBI APPLIED', 'APP SUBMITTED'] },
      'client':    { allowed_statuses: ['APP SUBMITTED', 'ENROLLED'] },
      'x-client':  { allowed_statuses: '*' }
    },
    individual_type_aliases: { 'x client': 'x-client' },
    policy_types_part_c:   ['PART C', 'MAPD'],
    policy_types_medsup:   ['MEDSUP'],
    policy_types_pdp:      ['PDP'],
    policy_types_life:     ['LIFE'],
    policy_types_aca:      ['ACA', 'ACA(INDV. HEALTH)'],
    policy_types_apple:    ['APPLE', 'APPLE HEALTH'],
    policy_types_chm:      ['CHM'],
    policy_types_non_aca:  ['NON-ACA'],
    policy_types_annuity:  ['ANNUITY'],
    policy_types_home:     ['HOME'],
    policy_types_auto:     ['AUTO'],
    forbidden_active_combinations: [
      { id: 'rule2_aca_with_part_c',    categories: ['aca', 'part_c'],    message: 'ACA + Part C' },
      { id: 'rule2_aca_with_apple',     categories: ['aca', 'apple'],     message: 'ACA + Apple' },
      { id: 'rule2_part_c_with_apple',  categories: ['part_c', 'apple'],  message: 'Part C + Apple' },
      { id: 'rule2_part_c_with_medsup', categories: ['part_c', 'medsup'], message: 'Part C + MedSup' },
      { id: 'rule2_part_c_with_pdp',    categories: ['part_c', 'pdp'],    message: 'Part C + PDP' }
    ],
    active_status_values:   ['ACTIVE'],
    pending_status_values:  ['PENDING'],
    inactive_status_values: ['INACTIVE', 'TERMINATED'],
    humana_carrier_keys:    ['humana'],
    pending_max_days:       15
  };
}

function test_rule1_type_status_consistency() {
  var cfg = abRulesTestCfg_();
  var inds = [
    { individual_type: 'prospect', status: 'CONTACTED', __src_row: 2 },
    { individual_type: 'prospect', status: 'ENROLLED',  __src_row: 3 }, // violation: Enrolled is Client-only
    { individual_type: 'client',   status: 'ENROLLED',  __src_row: 4 },
    { individual_type: 'client',   status: 'NOT CONTACTED YET', __src_row: 5 } // violation: NCY is Lead-only
  ];
  var v = rule1_typeStatusConsistency(inds, cfg);
  assertEqual(v.length, 2);
  assertEqual(v[0].rule_id, 'rule1_type_status');
  assertEqual(v[0].severity, SEVERITY.WARNING);
}

function test_rule1_app_submitted_valid_for_both_prospect_and_client() {
  // "App Submitted" is the transition state: an individual can carry it as
  // either Prospect (app filed, not yet approved) or Client (app filed,
  // marked converted). Rule 1 must accept both.
  var cfg = abRulesTestCfg_();
  var inds = [
    { individual_type: 'prospect', status: 'APP SUBMITTED', __src_row: 2 },
    { individual_type: 'client',   status: 'APP SUBMITTED', __src_row: 3 }
  ];
  var v = rule1_typeStatusConsistency(inds, cfg);
  assertEqual(v.length, 0);
}

function test_rule1_mbi_applied_is_prospect_only() {
  var cfg = abRulesTestCfg_();
  var inds = [
    { individual_type: 'prospect', status: 'MBI APPLIED', __src_row: 2 }, // OK
    { individual_type: 'lead',     status: 'MBI APPLIED', __src_row: 3 }, // violation
    { individual_type: 'client',   status: 'MBI APPLIED', __src_row: 4 }  // violation
  ];
  var v = rule1_typeStatusConsistency(inds, cfg);
  assertEqual(v.length, 2);
}

function test_rule1_legacy_cancelled_status_flagged_when_type_not_x_client() {
  // Real AB data carries some legacy "Cancelled" statuses (e.g. on rows
  // imported from older systems). It's not in the official enum, so Rule 1
  // should still flag it when the individual is anything other than X-Client.
  var cfg = abRulesTestCfg_();
  // x-client uses '*' in the test cfg so it's never flagged.
  var inds = [
    { individual_type: 'client', status: 'CANCELLED', __src_row: 2 }
  ];
  var v = rule1_typeStatusConsistency(inds, cfg);
  assertEqual(v.length, 1);
}

function test_rule2_part_c_combinations() {
  var cfg = abRulesTestCfg_();
  var policies = [
    { member_id: 'M1', policy_type: 'Part C', status: 'ACTIVE', __src_row: 2 },
    { member_id: 'M1', policy_type: 'Part C', status: 'ACTIVE', __src_row: 3 }, // duplicate Part C
    { member_id: 'M2', policy_type: 'Part C', status: 'ACTIVE', __src_row: 4 },
    { member_id: 'M2', policy_type: 'MedSup', status: 'ACTIVE', __src_row: 5 }, // forbidden combo
    { member_id: 'M3', policy_type: 'Life',   status: 'ACTIVE', __src_row: 6 },
    { member_id: 'M3', policy_type: 'Life',   status: 'ACTIVE', __src_row: 7 }  // multiple Life is OK
  ];
  var v = rule2_policyTypeCombinations(policies, cfg);
  var dup = v.filter(function (x) { return x.rule_id === 'rule2_duplicate_part_c'; });
  var combo = v.filter(function (x) { return x.rule_id === 'rule2_part_c_with_medsup'; });
  assertEqual(dup.length, 2, 'duplicate Part C flagged on each offending row');
  assertEqual(combo.length, 2, 'Part C + MedSup flagged on each row in the offending bucket');
}

function test_rule2_aca_with_part_c() {
  var cfg = abRulesTestCfg_();
  var policies = [
    { member_id: 'M1', policy_type: 'ACA(Indv. Health)', status: 'ACTIVE', __src_row: 2 },
    { member_id: 'M1', policy_type: 'Part C',            status: 'ACTIVE', __src_row: 3 }
  ];
  var v = rule2_policyTypeCombinations(policies, cfg);
  var hits = v.filter(function (x) { return x.rule_id === 'rule2_aca_with_part_c'; });
  assertEqual(hits.length, 2, 'both ACA and Part C rows flagged when active simultaneously');
}

function test_rule2_aca_pending_does_not_trigger() {
  // ACA active + Part C PENDING. PENDING is not active, so no rule2 violation
  // fires (rule2 only inspects ACTIVE policies). Pending Part C is normal
  // mid-conversion state.
  var cfg = abRulesTestCfg_();
  var policies = [
    { member_id: 'M1', policy_type: 'ACA',    status: 'ACTIVE',  __src_row: 2 },
    { member_id: 'M1', policy_type: 'Part C', status: 'PENDING', __src_row: 3 }
  ];
  var v = rule2_policyTypeCombinations(policies, cfg);
  var hits = v.filter(function (x) { return x.rule_id === 'rule2_aca_with_part_c'; });
  assertEqual(hits.length, 0, 'pending Part C alongside active ACA is not a Rule 2 violation');
}

function test_rule2_aca_with_apple() {
  var cfg = abRulesTestCfg_();
  var policies = [
    { member_id: 'M1', policy_type: 'ACA',          status: 'ACTIVE', __src_row: 2 },
    { member_id: 'M1', policy_type: 'Apple Health', status: 'ACTIVE', __src_row: 3 }
  ];
  var v = rule2_policyTypeCombinations(policies, cfg);
  var hits = v.filter(function (x) { return x.rule_id === 'rule2_aca_with_apple'; });
  assertEqual(hits.length, 2);
}

function test_rule2_part_c_with_apple() {
  var cfg = abRulesTestCfg_();
  var policies = [
    { member_id: 'M1', policy_type: 'Part C',       status: 'ACTIVE', __src_row: 2 },
    { member_id: 'M1', policy_type: 'Apple Health', status: 'ACTIVE', __src_row: 3 }
  ];
  var v = rule2_policyTypeCombinations(policies, cfg);
  var hits = v.filter(function (x) { return x.rule_id === 'rule2_part_c_with_apple'; });
  assertEqual(hits.length, 2);
}

function test_rule2_safe_combos_do_not_trigger() {
  var cfg = abRulesTestCfg_();
  var policies = [
    // MedSup + PDP allowed
    { member_id: 'M1', policy_type: 'MedSup', status: 'ACTIVE', __src_row: 2 },
    { member_id: 'M1', policy_type: 'PDP',    status: 'ACTIVE', __src_row: 3 },
    // CHM + Non-ACA allowed
    { member_id: 'M2', policy_type: 'CHM',     status: 'ACTIVE', __src_row: 4 },
    { member_id: 'M2', policy_type: 'NON-ACA', status: 'ACTIVE', __src_row: 5 },
    // Annuity / Life / Home / Auto can pair with anything
    { member_id: 'M3', policy_type: 'Part C',  status: 'ACTIVE', __src_row: 6 },
    { member_id: 'M3', policy_type: 'Annuity', status: 'ACTIVE', __src_row: 7 },
    { member_id: 'M3', policy_type: 'Life',    status: 'ACTIVE', __src_row: 8 },
    { member_id: 'M3', policy_type: 'Auto',    status: 'ACTIVE', __src_row: 9 },
    { member_id: 'M3', policy_type: 'Home',    status: 'ACTIVE', __src_row: 10 }
  ];
  var v = rule2_policyTypeCombinations(policies, cfg);
  assertEqual(v.length, 0, 'MedSup+PDP, CHM+Non-ACA, and ancillary combos must not trigger');
}

function test_rule2_three_way_violation() {
  // Member with all three of {ACA, Part C, Apple} active. Each pair is a
  // distinct forbidden combo, so all three policies should be flagged
  // (deduplicated per rule per row).
  var cfg = abRulesTestCfg_();
  var policies = [
    { member_id: 'M1', policy_type: 'ACA',          status: 'ACTIVE', __src_row: 2 },
    { member_id: 'M1', policy_type: 'Part C',       status: 'ACTIVE', __src_row: 3 },
    { member_id: 'M1', policy_type: 'Apple Health', status: 'ACTIVE', __src_row: 4 }
  ];
  var v = rule2_policyTypeCombinations(policies, cfg);
  // 3 forbidden pairs each flag 2 rows = 6 total exception entries.
  // (each row appears in two pairs, but flagged separately per rule.)
  var ids = {};
  v.forEach(function (x) { ids[x.rule_id] = (ids[x.rule_id] || 0) + 1; });
  assertEqual(ids.rule2_aca_with_part_c,   2);
  assertEqual(ids.rule2_aca_with_apple,    2);
  assertEqual(ids.rule2_part_c_with_apple, 2);
}

function test_rule3_active_policy_requires_client() {
  var cfg = abRulesTestCfg_();
  var policies = [
    { member_id: 'M1', status: 'ACTIVE', __src_row: 2 }
  ];
  var inds = [
    { member_id: 'M1', individual_type: 'prospect', status: 'CONTACTED', __src_row: 5 }
  ];
  var v = rule3_activePolicyRequiresClient(policies, inds, cfg);
  assertEqual(v.length, 1);
  assertEqual(v[0].rule_id, 'rule3_active_policy_requires_client');
  assertEqual(v[0].severity, SEVERITY.ERROR);
}

function test_rule4_non_client_has_no_active() {
  var cfg = abRulesTestCfg_();
  var policies = [{ member_id: 'M1', status: 'ACTIVE', __src_row: 2 }];
  var inds = [{ member_id: 'M1', individual_type: 'prospect', status: 'CONTACTED', __src_row: 5 }];
  var v = rule4_nonClientHasNoActive(policies, inds, cfg);
  assertEqual(v.length, 1);
  assertEqual(v[0].rule_id, 'rule4_non_client_has_active');
}

function test_rule5_missing_signing_agents() {
  var cfg = abRulesTestCfg_();
  var policies = [
    { policy_number: 'P1', status: 'ACTIVE', signed_by: 'Alice', servicing_agent: '', __src_row: 2 },
    { policy_number: 'P2', status: 'ACTIVE', signed_by: 'Alice', servicing_agent: 'Alice', __src_row: 3 },
    { policy_number: 'P3', status: 'TERMINATED', signed_by: '', servicing_agent: '', __src_row: 4 } // skipped (inactive)
  ];
  var v = rule5_missingSigningAgents(policies, cfg);
  assertEqual(v.length, 1);
  assertEqual(v[0].left.policy_number, 'P1');
}

function test_rule6_id_identity_humana_vs_others() {
  var cfg = abRulesTestCfg_();
  var policies = [
    { member_id: 'X', policy_number: 'X', carrier_normalized: 'uhc',    status: 'ACTIVE', __src_row: 2 }, // ok
    { member_id: 'X', policy_number: 'Y', carrier_normalized: 'uhc',    status: 'ACTIVE', __src_row: 3 }, // violation (must equal)
    { member_id: 'A', policy_number: 'A', carrier_normalized: 'humana', status: 'ACTIVE', __src_row: 4 }, // violation (must NOT equal for Humana)
    { member_id: 'A', policy_number: 'B', carrier_normalized: 'humana', status: 'ACTIVE', __src_row: 5 }  // ok
  ];
  var v = rule6_idIdentityRule(policies, cfg);
  assertEqual(v.length, 2);
  var nonHumana = v.filter(function (x) { return x.rule_id === 'rule6_id_mismatch_non_humana'; });
  var humana    = v.filter(function (x) { return x.rule_id === 'rule6_humana_id_collision'; });
  assertEqual(nonHumana.length, 1);
  assertEqual(humana.length, 1);
}

function test_rule7_blank_identifiers() {
  var cfg = abRulesTestCfg_();
  var policies = [
    { member_id: '', policy_number: 'P1', status: 'ACTIVE', __src_row: 2 },   // violation
    { member_id: '', policy_number: '',   status: 'PENDING', __src_row: 3 }   // pending allowed
  ];
  var v = rule7_blankIdentifiers(policies, cfg);
  assertEqual(v.length, 1);
}

function test_rule8_pending_too_long() {
  var cfg = abRulesTestCfg_();
  var oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  var iso = oldDate.getFullYear() + '-' + pad2_(oldDate.getMonth() + 1) + '-' + pad2_(oldDate.getDate());
  var policies = [
    { policy_number: 'P1', status: 'PENDING', app_submit_date: iso, __src_row: 2 },        // violation (30d > 15d)
    { policy_number: 'P2', status: 'PENDING', app_submit_date: '2099-01-01', __src_row: 3 } // future date, no violation
  ];
  var v = rule8_pendingTooLong(policies, cfg);
  assertEqual(v.length, 1);
  assertEqual(v[0].left.policy_number, 'P1');
}

function test_rule9_date_ordering() {
  var cfg = abRulesTestCfg_();
  var policies = [
    { policy_number: 'P1', status: 'ACTIVE', app_submit_date: '2024-06-01', effective_date: '2024-01-01', __src_row: 2 }, // submit > effective
    { policy_number: 'P2', status: 'INACTIVE', app_submit_date: '2024-01-01', effective_date: '2024-02-01', __src_row: 3 }, // missing term
    { policy_number: 'P3', status: 'ACTIVE', app_submit_date: '', effective_date: '', __src_row: 4 } // missing both
  ];
  var v = rule9_dateOrdering(policies, cfg);
  // P1: submit_after_effective; P2: inactive_missing_term_date; P3: missing_app_submit + missing_effective
  assertTrue(v.length >= 4, 'expected at least 4 rule 9 violations, got ' + v.length);
}

function test_rule10_backfill_from_active_policy() {
  var cfg = abRulesTestCfg_();
  var inds = [
    { first_name: 'Jane', last_name: 'Doe', dob: '1950-01-01', individual_type: 'client', status: 'ENROLLED', member_id: '', __src_row: 5 }
  ];
  var policies = [
    { first_name: 'Jane', last_name: 'Doe', dob: '1950-01-01', member_id: 'M555', insurance_plan: 'Gold PPO', status: 'ACTIVE', __src_row: 2 }
  ];
  var v = rule10_backfillFromActivePolicy(inds, policies, [], cfg);
  assertEqual(v.length, 1);
  assertTrue(v[0].suggested_value.indexOf('M555') !== -1, 'suggested_value should contain member_id from active policy');
}

// ---- BoB-source-of-truth ----

function test_bob_source_of_truth_emits_when_ab_missing() {
  // Stub the global rules config so bobSourceOfTruthFlags_ has what it needs.
  // (We can't override getAbOnlyRulesConfig_ cleanly here; rely on whichever
  //  config is loaded in the deployed env. The defaults set ACTIVE = active.)
  var cfg = { id: 'ab_vs_uhc', right: 'uhc_bob' };
  var bob = [{ member_id: 'M1', status: 'ACTIVE', __src_row: 2 }];
  var inds = []; // missing in AB
  var policies = [];
  var v = bobSourceOfTruthFlags_(cfg, bob, inds, policies, []);
  assertEqual(v.length, 1);
  assertEqual(v[0].type, EXCEPTION_TYPES.BOB_ACTIVE_AB_INACTIVE);
}

// ---- MBI gate ----

function test_mbi_gate_via_resolveAlias() {
  var headerWithMbi = ['First Name', 'Last Name', 'DOB', 'MBI'];
  var headerNoMbi   = ['First Name', 'Last Name', 'DOB'];
  assertTrue(resolveAlias_(headerWithMbi, ['MBI', 'Medicare Number']) === 'MBI');
  assertTrue(resolveAlias_(headerNoMbi,   ['MBI', 'Medicare Number']) === null);
}
