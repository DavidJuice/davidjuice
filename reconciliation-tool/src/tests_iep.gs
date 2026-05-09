// Medicare IEP Tracker — unit tests
// Run via the Reconciliation -> Run All Tests menu (the names are listed in
// tests_runner.gs).

// ---- Date math ----

function test_iep_iso_parse_and_format() {
  var d = parseIso_('2026-03-15');
  assertEqual(d.getFullYear(), 2026);
  assertEqual(d.getMonth(), 2);
  assertEqual(d.getDate(), 15);
  assertEqual(isoOf_(d), '2026-03-15');

  // Two-digit padding
  var d2 = new Date(2026, 0, 9);
  assertEqual(isoOf_(d2), '2026-01-09');

  // Junk input returns null without throwing
  assertEqual(parseIso_(''), null);
  assertEqual(parseIso_(null), null);
  assertEqual(parseIso_('not-a-date'), null);
}

function test_iep_add_years_handles_leap_year() {
  // Feb 29 1960 + 65 years -> Feb 29 2025 doesn't exist; JS rolls to Mar 1.
  var dob = new Date(1960, 1, 29);
  var sixtyFifth = addYears_(dob, 65);
  // We're not picky about which carry-over JS does; assert it lands in
  // March 2025 (either 03-01 or close).
  assertEqual(sixtyFifth.getFullYear(), 2025);
  assertEqual(sixtyFifth.getMonth(), 2); // March
  assertEqual(sixtyFifth.getDate(), 1);
}

function test_iep_effective_range_is_5_months_from_birth_month() {
  // Person turning 65 on March 15, 2026.
  var sixtyFifth = new Date(2026, 2, 15);
  var range = iepEffectiveRange_(sixtyFifth);
  // Earliest IEP-effective date: March 1, 2026 (applied 1-3 months before)
  assertEqual(isoOf_(range.start), '2026-03-01');
  // Exclusive end: August 1, 2026 (5 months after start).
  // Latest possible IEP-effective is July 1, 2026 (applied month M+3).
  assertEqual(isoOf_(range.endExcl), '2026-08-01');
}

// ---- Coverage-type classification ----

function test_iep_is_part_c_coverage_aliases() {
  assertEqual(isPartCCoverage_('Part C'), true);
  assertEqual(isPartCCoverage_('Medicare Advantage'), true);
  assertEqual(isPartCCoverage_('MAPD'), true);
  assertEqual(isPartCCoverage_('MA-PD'), true);
  // Negative cases
  assertEqual(isPartCCoverage_(''), false);
  assertEqual(isPartCCoverage_('MedSup'), false);
  assertEqual(isPartCCoverage_('ACA'), false);
}

function test_iep_is_aca_coverage_aliases() {
  assertEqual(isAcaCoverage_('ACA(Indv. Health)'), true);
  assertEqual(isAcaCoverage_('ACA (Indv. Health)'), true);
  assertEqual(isAcaCoverage_('Individual Health'), true);
  assertEqual(isAcaCoverage_('aca'), true);
  assertEqual(isAcaCoverage_(''), false);
  assertEqual(isAcaCoverage_('Part C'), false);
}

function test_iep_member_id_for_display_swaps_for_aca() {
  // For ACA coverage the displayed Member ID column shows WAHPF App ID.
  var aca = { policy_type: 'ACA(Indv. Health)', member_id: 'CARRIER123', wahpf_app_id: 'WAHPF999' };
  assertEqual(memberIdForDisplay_(aca), 'WAHPF999');

  // Non-ACA shows member_id.
  var partC = { policy_type: 'Part C', member_id: 'UHC555', wahpf_app_id: '' };
  assertEqual(memberIdForDisplay_(partC), 'UHC555');

  // ACA without WAHPF falls back to member_id.
  var acaNoWahpf = { policy_type: 'ACA', member_id: 'X', wahpf_app_id: '' };
  assertEqual(memberIdForDisplay_(acaNoWahpf), 'X');
}

// ---- iepAnalyze_ behavior ----

function iepClientFixture_(args) {
  return {
    individual_type: args.type || 'Client',
    first_name: args.first || 'Jane',
    last_name:  args.last  || 'Doe',
    middle_name: args.middle || '',
    dob:        args.dob,
    mbi:        args.mbi || '',
    servicing_agent: args.agent || 'Alice',
    status:     args.status || 'Enrolled',
    individual_id: args.individualId || ('I' + (args.row || 0)),
    __src_row:  args.row || 1
  };
}

function iepPolicyFixture_(args) {
  return {
    first_name: args.first || 'Jane',
    last_name:  args.last  || 'Doe',
    middle_name: args.middle || '',
    dob:        args.dob,
    mbi:        args.mbi || '',
    policy_type: args.coverageType,
    status:     args.status || 'ACTIVE',
    effective_date: args.effective,
    plan_name:  args.plan || '',
    member_id:  args.memberId || '',
    wahpf_app_id: args.wahpf || '',
    policy_number: args.policyNumber || '',
    carrier:    args.carrier || '',
    signed_by:  args.signed_by || '',
    servicing_agent: args.servicing || '',
    __src_row:  args.row || 1
  };
}

function test_iep_analyze_filters_to_clients_only() {
  // Prospects whose 65th would otherwise fall in the window get dropped.
  var inds = [
    iepClientFixture_({ type: 'Client',   dob: '1961-04-10', row: 2 }),
    iepClientFixture_({ type: 'Prospect', dob: '1961-04-10', row: 3 }),
    iepClientFixture_({ type: 'Lead',     dob: '1961-04-10', row: 4 })
  ];
  var pols = [];
  var res = iepAnalyze_(inds, pols, new Date(2026, 0, 1), new Date(2026, 11, 31), []);
  assertEqual(res.rows.length, 1);
  assertEqual(res.rows[0].individual_type, 'Client');
}

function test_iep_analyze_window_filter() {
  // Two clients: one inside window, one outside.
  var inds = [
    iepClientFixture_({ first: 'In',  dob: '1961-04-10', row: 2 }),
    iepClientFixture_({ first: 'Out', dob: '1965-01-01', row: 3 })
  ];
  var res = iepAnalyze_(inds, [], new Date(2026, 0, 1), new Date(2026, 11, 31), []);
  assertEqual(res.rows.length, 1);
  assertEqual(res.rows[0].full_name.indexOf('In') === 0, true);
}

function test_iep_analyze_classifies_converted_within_iep_window() {
  // 65th = April 10, 2026. IEP-effective range = [2026-04-01, 2026-09-01).
  // A Part C policy effective 2026-05-01 -> Converted.
  var inds = [iepClientFixture_({ dob: '1961-04-10', row: 2 })];
  var pols = [iepPolicyFixture_({ dob: '1961-04-10', coverageType: 'Part C',
                                   status: 'ACTIVE', effective: '2026-05-01', row: 5 })];
  var res = iepAnalyze_(inds, pols, new Date(2026, 0, 1), new Date(2026, 11, 31), []);
  assertEqual(res.rows.length, 1);
  assertEqual(res.rows[0].conversion_status, 'Converted (IEP)');
}

function test_iep_analyze_marks_part_c_outside_iep_as_not_converted() {
  // Same client, but Part C effective is BEFORE their 65th (2024-12-01).
  // That cannot be an IEP-driven conversion -> Not Converted Yet.
  var inds = [iepClientFixture_({ dob: '1961-04-10', row: 2 })];
  var pols = [iepPolicyFixture_({ dob: '1961-04-10', coverageType: 'Part C',
                                   status: 'ACTIVE', effective: '2024-12-01', row: 5 })];
  var res = iepAnalyze_(inds, pols, new Date(2026, 0, 1), new Date(2026, 11, 31), []);
  assertEqual(res.rows[0].conversion_status, 'Not Converted Yet');
}

function test_iep_analyze_pending_part_c_in_iep_window_counts_as_converted() {
  // PENDING Part C effective inside IEP range -> Converted.
  var inds = [iepClientFixture_({ dob: '1961-04-10', row: 2 })];
  var pols = [iepPolicyFixture_({ dob: '1961-04-10', coverageType: 'Part C',
                                   status: 'PENDING', effective: '2026-05-01', row: 5 })];
  var res = iepAnalyze_(inds, pols, new Date(2026, 0, 1), new Date(2026, 11, 31), []);
  assertEqual(res.rows[0].conversion_status, 'Converted (IEP)');
}

function test_iep_stats_aggregation() {
  var rows = [
    { servicing_agent: 'Alice', sixty_fifth_birthday: '2026-03-15', conversion_status: 'Converted (IEP)' },
    { servicing_agent: 'Alice', sixty_fifth_birthday: '2026-03-22', conversion_status: 'Not Converted Yet' },
    { servicing_agent: 'Bob',   sixty_fifth_birthday: '2026-04-05', conversion_status: 'Converted (IEP)' }
  ];
  var stats = buildIepStats_(rows, new Date(2026, 2, 1), new Date(2026, 4, 31));
  assertEqual(stats.totals.total, 3);
  assertEqual(stats.totals.converted, 2);
  assertEqual(stats.totals.not_converted, 1);
  assertEqual(stats.agents.length, 2);

  var alice = stats.agents.filter(function (a) { return a.agent === 'Alice'; })[0];
  assertEqual(alice.total, 2);
  assertEqual(alice.converted, 1);
  assertEqual(alice.monthly['2026-03'].total, 2);

  var bob = stats.agents.filter(function (a) { return a.agent === 'Bob'; })[0];
  assertEqual(bob.monthly['2026-04'].converted, 1);
}

function test_iep_yoy_lookup_finds_same_month_last_year() {
  // Two clients turning 65 in March of consecutive years; both converted.
  var inds = [
    iepClientFixture_({ first: 'This', last: 'Year',  dob: '1961-03-15', row: 2 }),
    iepClientFixture_({ first: 'Last', last: 'Year',  dob: '1960-03-15', row: 3 })
  ];
  var pols = [
    iepPolicyFixture_({ first: 'This', last: 'Year', dob: '1961-03-15', coverageType: 'Part C',
                         status: 'ACTIVE', effective: '2026-04-01', row: 4 }),
    iepPolicyFixture_({ first: 'Last', last: 'Year', dob: '1960-03-15', coverageType: 'Part C',
                         status: 'ACTIVE', effective: '2025-04-01', row: 5 })
  ];
  var yoy = computeIepYoY_(inds, pols, new Date(2026, 2, 1), new Date(2026, 2, 31));
  assertEqual(yoy.length, 1);
  assertEqual(yoy[0].month, '2026-03');
  assertEqual(yoy[0].this_year_total, 1);
  assertEqual(yoy[0].this_year_converted, 1);
  assertEqual(yoy[0].last_year_month, '2025-03');
  assertEqual(yoy[0].last_year_total, 1);
  assertEqual(yoy[0].last_year_converted, 1);
}
