// Data Search — unit tests
// Run via the Reconciliation -> Run All Tests menu.

function dsClientFixture_(args) {
  return {
    individual_id:    args.id,
    first_name:       args.first || 'Jane',
    last_name:        args.last  || 'Doe',
    middle_name:      args.middle || '',
    dob:              args.dob,
    gender:           args.gender || 'Female',
    county:           args.county || 'King',
    city:             args.city || 'Seattle',
    state:            args.state || 'WA',
    zip:              args.zip || '98101',
    primary_language: args.language || 'English',
    country:          args.country || 'United States',
    servicing_agent:  args.agent || 'Alice',
    individual_type:  args.type || 'Client',
    status:           args.status || 'Enrolled',
    medicaid_level:   args.medicaidLevel || '',
    medicaid_number:  args.medicaidId || '',
    phone_cellular:   args.phone || '',
    email:            args.email || '',
    address:          args.address || '',
    __src_row:        args.row || 1
  };
}

function dsPolicyFixture_(args) {
  return {
    individual_id:   args.individualId,
    policy_type:     args.coverageType,
    status:          args.status || 'ACTIVE',
    carrier:         args.carrier || 'United Healthcare',
    plan_name:       args.product || '',
    member_id:       args.memberId || '',
    policy_number:   args.policyNumber || '',
    effective_date:  args.effective || '',
    __src_row:       args.row || 1
  };
}

// ---- Derived fields ----

function test_ds_age_computation() {
  var today = new Date(2026, 5, 15); // June 15, 2026
  // Born March 10, 1960 -> turned 66 on March 10, 2026
  assertEqual(dsAgeOn_(new Date(1960, 2, 10), today), 66);
  // Born December 1, 1960 -> still 65 in June 2026
  assertEqual(dsAgeOn_(new Date(1960, 11, 1), today), 65);
}

function test_ds_dsnp_detected_by_medicaid_plus_part_c() {
  // Client has Medicaid Level + active Part C -> DSNP candidate even with
  // no "Dual SNP" string in Product Name.
  var inds = [dsClientFixture_({ id: 'I1', medicaidLevel: 'Full', row: 2 })];
  var pols = [dsPolicyFixture_({ individualId: 'I1', coverageType: 'Part C',
                                  product: 'AARP Medicare Advantage', status: 'ACTIVE', row: 5 })];
  var res = dataSearchAnalyze_(inds, pols, { is_dsnp: 'yes' });
  assertEqual(res.clients.length, 1);
  assertEqual(res.clients[0].is_dsnp, 'Yes');
}

function test_ds_dsnp_detected_by_product_name_substring() {
  // No Medicaid info, but Product Name contains "Dual SNP" -> still DSNP.
  var inds = [dsClientFixture_({ id: 'I1', row: 2 })];
  var pols = [dsPolicyFixture_({ individualId: 'I1', coverageType: 'Part C',
                                  product: 'UHC Dual SNP Complete', status: 'ACTIVE', row: 5 })];
  var res = dataSearchAnalyze_(inds, pols, { is_dsnp: 'yes' });
  assertEqual(res.clients.length, 1);
  assertEqual(res.clients[0].is_dsnp, 'Yes');
}

function test_ds_dsnp_false_when_no_signal() {
  var inds = [dsClientFixture_({ id: 'I1', row: 2 })];
  var pols = [dsPolicyFixture_({ individualId: 'I1', coverageType: 'Part C',
                                  product: 'AARP Medicare Advantage', status: 'ACTIVE', row: 5 })];
  var res = dataSearchAnalyze_(inds, pols, {});
  assertEqual(res.clients[0].is_dsnp, 'No');
}

function test_ds_csnp_detected_by_product_name_substring() {
  var inds = [dsClientFixture_({ id: 'I1', row: 2 })];
  var pols = [dsPolicyFixture_({ individualId: 'I1', coverageType: 'Part C',
                                  product: 'Humana C-SNP Diabetes', status: 'ACTIVE', row: 5 })];
  var res = dataSearchAnalyze_(inds, pols, { is_csnp: 'yes' });
  assertEqual(res.clients.length, 1);
  assertEqual(res.clients[0].is_csnp, 'Yes');
}

// ---- Filters ----

function test_ds_age_range_filter() {
  var inds = [
    dsClientFixture_({ id: 'I1', dob: '1955-01-01', row: 2 }), // ~71
    dsClientFixture_({ id: 'I2', dob: '1965-01-01', row: 3 }), // ~61
    dsClientFixture_({ id: 'I3', dob: '1985-01-01', row: 4 })  // ~41
  ];
  var res = dataSearchAnalyze_(inds, [], { age_min: 60, age_max: 70 });
  assertEqual(res.clients.length, 1);
  assertEqual(res.clients[0].individual_id, 'I2');
}

function test_ds_county_filter_case_insensitive() {
  var inds = [
    dsClientFixture_({ id: 'I1', county: 'King',     row: 2 }),
    dsClientFixture_({ id: 'I2', county: 'Pierce',   row: 3 }),
    dsClientFixture_({ id: 'I3', county: 'Snohomish',row: 4 })
  ];
  var res = dataSearchAnalyze_(inds, [], { counties: ['king', 'PIERCE'] });
  var ids = res.clients.map(function (r) { return r.individual_id; }).sort();
  assertEqual(ids.length, 2);
  assertEqual(ids[0], 'I1');
  assertEqual(ids[1], 'I2');
}

function test_ds_language_filter() {
  var inds = [
    dsClientFixture_({ id: 'I1', language: 'Spanish', row: 2 }),
    dsClientFixture_({ id: 'I2', language: 'English', row: 3 }),
    dsClientFixture_({ id: 'I3', language: 'Korean',  row: 4 })
  ];
  var res = dataSearchAnalyze_(inds, [], { languages: ['Spanish', 'Korean'] });
  assertEqual(res.clients.length, 2);
}

function test_ds_medicaid_yes_filter() {
  var inds = [
    dsClientFixture_({ id: 'I1', medicaidLevel: 'Full', row: 2 }),
    dsClientFixture_({ id: 'I2', row: 3 }),
    dsClientFixture_({ id: 'I3', medicaidId: 'WA999', row: 4 })
  ];
  var res = dataSearchAnalyze_(inds, [], { medicaid: 'yes' });
  var ids = res.clients.map(function (r) { return r.individual_id; }).sort();
  assertEqual(ids.length, 2);
  assertEqual(ids[0], 'I1');
  assertEqual(ids[1], 'I3');
}

function test_ds_coverage_type_filter_requires_policy_join() {
  var inds = [
    dsClientFixture_({ id: 'I1', row: 2 }),
    dsClientFixture_({ id: 'I2', row: 3 })
  ];
  var pols = [
    dsPolicyFixture_({ individualId: 'I1', coverageType: 'Part C', status: 'ACTIVE', row: 5 }),
    dsPolicyFixture_({ individualId: 'I2', coverageType: 'MedSup', status: 'ACTIVE', row: 6 })
  ];
  var res = dataSearchAnalyze_(inds, pols, { coverage_types: ['Part C'] });
  assertEqual(res.clients.length, 1);
  assertEqual(res.clients[0].individual_id, 'I1');
}

// ---- Multi-policy output shape ----

function test_ds_multiple_active_policies_summary_and_pairs() {
  var inds = [dsClientFixture_({ id: 'I1', row: 2 })];
  var pols = [
    dsPolicyFixture_({ individualId: 'I1', coverageType: 'Part C', carrier: 'UHC',    status: 'ACTIVE',  row: 5 }),
    dsPolicyFixture_({ individualId: 'I1', coverageType: 'MedSup', carrier: 'Mutual', status: 'PENDING', row: 6 }),
    dsPolicyFixture_({ individualId: 'I1', coverageType: 'Life',   carrier: 'Mutual', status: 'TERMINATED', row: 7 })
  ];
  var res = dataSearchAnalyze_(inds, pols, {});
  // Inactive policy not counted; 2 active/pending pairs.
  assertEqual(res.clients.length, 1);
  assertEqual(res.clients[0].active_policy_count, 2);
  assertEqual(res.policyPairs.length, 2);
  // Summary cell includes both
  assertTrue(res.clients[0].active_policies_summary.indexOf('Part C') !== -1);
  assertTrue(res.clients[0].active_policies_summary.indexOf('MedSup') !== -1);
}

function test_ds_client_with_no_policies_still_appears_outer_join() {
  var inds = [dsClientFixture_({ id: 'I1', row: 2 })];
  var res = dataSearchAnalyze_(inds, [], {});
  assertEqual(res.clients.length, 1);
  assertEqual(res.clients[0].active_policy_count, 0);
  assertEqual(res.policyPairs.length, 0);
}
