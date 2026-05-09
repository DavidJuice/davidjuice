// Lightweight assertion harness for Apps Script. All test_* functions are
// auto-discovered by name and run from the Reconciliation -> Run All Tests menu.
// Results land in a TestResults tab.

var __TEST_RESULTS = [];

function assertEqual(actual, expected, msg) {
  var ok = actual === expected ||
           (typeof actual === 'number' && typeof expected === 'number' && Math.abs(actual - expected) < 1e-9);
  if (!ok) throw new Error((msg || 'assertEqual') + ': expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual));
}

function assertDeepEqual(a, b, msg) {
  var sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error((msg || 'assertDeepEqual') + ': expected ' + sb + ' got ' + sa);
}

function assertTrue(cond, msg) {
  if (!cond) throw new Error((msg || 'assertTrue') + ': expected truthy');
}

function runAllTests() {
  __TEST_RESULTS = [];
  var fns = [
    'test_csv_parser',
    'test_normalize_basic',
    'test_humana_collapse',
    'test_match_key_priority',
    'test_only_in_ab_and_carrier',
    'test_field_mismatch_detection',
    'test_email_filter_no_cross_agent',
    'test_safelog_strips_phi',
    // Phase 2
    'test_match_key_priority_mbi_first',
    'test_match_humana_skip_policy_number',
    'test_name_dob_match_with_middle_name_optional',
    'test_normalize_carrier_humana_wa',
    'test_rule1_type_status_consistency',
    'test_rule2_part_c_combinations',
    'test_rule3_active_policy_requires_client',
    'test_rule4_non_client_has_no_active',
    'test_rule5_missing_signing_agents',
    'test_rule6_id_identity_humana_vs_others',
    'test_rule7_blank_identifiers',
    'test_rule8_pending_too_long',
    'test_rule9_date_ordering',
    'test_rule10_backfill_from_active_policy',
    'test_bob_source_of_truth_emits_when_ab_missing',
    'test_mbi_gate_via_resolveAlias',
    // Rule 2 expansion
    'test_rule2_aca_with_part_c',
    'test_rule2_aca_pending_does_not_trigger',
    'test_rule2_aca_with_apple',
    'test_rule2_part_c_with_apple',
    'test_rule2_safe_combos_do_not_trigger',
    'test_rule2_three_way_violation',
    // IEP tracker
    'test_iep_iso_parse_and_format',
    'test_iep_add_years_handles_leap_year',
    'test_iep_effective_range_is_5_months_from_birth_month',
    'test_iep_is_part_c_coverage_aliases',
    'test_iep_is_aca_coverage_aliases',
    'test_iep_member_id_for_display_swaps_for_aca',
    'test_iep_analyze_filters_to_clients_only',
    'test_iep_analyze_window_filter',
    'test_iep_analyze_classifies_converted_within_iep_window',
    'test_iep_analyze_marks_part_c_outside_iep_as_not_converted',
    'test_iep_analyze_pending_part_c_in_iep_window_counts_as_converted',
    'test_iep_stats_aggregation',
    'test_iep_yoy_lookup_finds_same_month_last_year'
  ];
  fns.forEach(function (name) {
    var t0 = Date.now();
    try {
      this[name]();
      __TEST_RESULTS.push({ name: name, status: 'PASS', ms: Date.now() - t0, error: '' });
    } catch (e) {
      __TEST_RESULTS.push({ name: name, status: 'FAIL', ms: Date.now() - t0, error: String(e && e.message || e) });
    }
  });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB_TEST_RESULTS);
  if (!sh) sh = ss.insertSheet(TAB_TEST_RESULTS);
  sh.clear();
  sh.appendRow(['timestamp', 'name', 'status', 'ms', 'error']);
  sh.setFrozenRows(1);
  __TEST_RESULTS.forEach(function (r) {
    sh.appendRow([new Date(), r.name, r.status, r.ms, r.error]);
  });
  var passed = __TEST_RESULTS.filter(function (r) { return r.status === 'PASS'; }).length;
  SpreadsheetApp.getUi().alert(passed + ' / ' + __TEST_RESULTS.length + ' tests passed. See ' + TAB_TEST_RESULTS + ' tab for details.');
}
