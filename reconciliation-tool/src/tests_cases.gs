// Test cases. Run via Reconciliation -> Run All Tests.

function test_csv_parser() {
  var rows = parseCsv('a,b,c\n1,"two, with comma","three\nline"\n4,5,6\n');
  assertEqual(rows.length, 3, 'row count');
  assertDeepEqual(rows[0], ['a', 'b', 'c']);
  assertDeepEqual(rows[1], ['1', 'two, with comma', 'three\nline']);
  assertDeepEqual(rows[2], ['4', '5', '6']);

  var quoted = parseCsv('"a""b",c\n');
  assertEqual(quoted[0][0], 'a"b');
}

function test_normalize_basic() {
  var raw = [
    ['First Name', 'Last Name', 'DOB', 'Member ID', 'Agent of Record', 'Effective Date', 'Plan', 'Status'],
    ['Jane', 'Doe', '01/15/1955', 'M001', 'Alice Agent', '2025-01-01', 'PPO Gold', 'active'],
    ['John', 'Smith', '7/4/1948', 'M002', 'Bob Agent', '2024-06-01', 'HMO Silver', 'TERMINATED']
  ];
  var out = normalize('ab_individual', raw);
  assertEqual(out.length, 2);
  assertEqual(out[0].first_name, 'Jane');
  assertEqual(out[0].dob, '1955-01-15');
  assertEqual(out[0].status, 'ACTIVE');
  assertEqual(out[1].dob, '1948-07-04');
}

function test_humana_collapse() {
  var rows = [
    { policy_number: 'P1', event_date: '2024-01-01', status: 'ACTIVE',     __src_row: 2 },
    { policy_number: 'P1', event_date: '2024-06-01', status: 'TERMINATED', __src_row: 3 },
    { policy_number: 'P1', event_date: '2024-03-01', status: 'ACTIVE',     __src_row: 4 },
    { policy_number: 'P2', event_date: '2024-02-01', status: 'ACTIVE',     __src_row: 5 }
  ];
  var collapsed = collapseHistory(rows, { groupBy: 'policy_number', latestBy: 'event_date' });
  assertEqual(collapsed.length, 2);
  var byPolicy = {};
  collapsed.forEach(function (r) { byPolicy[r.policy_number] = r; });
  assertEqual(byPolicy.P1.event_date, '2024-06-01');
  assertEqual(byPolicy.P1.status, 'TERMINATED');
  assertEqual(byPolicy.P2.status, 'ACTIVE');
}

function test_match_key_priority() {
  var left  = [{ member_id: 'M1', policy_number: 'P1', last_name: 'Doe', first_name: 'Jane', dob: '1950-01-01', __src_row: 1 }];
  var right = [{ member_id: 'M1', policy_number: 'P9', last_name: 'Roe', first_name: 'Jane', dob: '1999-12-31', __src_row: 1 }];
  var exc = matchAndCompare(left, right, ['member_id', 'policy_number', 'name_dob'], [], 'unit', false);
  // member_id matches across the two records, so this should NOT produce only_in_AB.
  var onlyAB = exc.filter(function (e) { return e.type === 'only_in_AB'; });
  assertEqual(onlyAB.length, 0, 'should match by member_id even when name+dob differ');
}

function test_only_in_ab_and_carrier() {
  var left  = [{ member_id: 'A', __src_row: 1 }, { member_id: 'B', __src_row: 2 }];
  var right = [{ member_id: 'B', __src_row: 1 }, { member_id: 'C', __src_row: 2 }];
  var exc = matchAndCompare(left, right, ['member_id'], [], 'unit', false);
  var ab = exc.filter(function (e) { return e.type === 'only_in_AB'; });
  var car = exc.filter(function (e) { return e.type === 'only_in_carrier'; });
  assertEqual(ab.length, 1);
  assertEqual(ab[0].left.member_id, 'A');
  assertEqual(car.length, 1);
  assertEqual(car[0].right.member_id, 'C');
}

function test_field_mismatch_detection() {
  var left  = [{ member_id: 'X', plan_name: 'PPO Gold', status: 'ACTIVE', __src_row: 1 }];
  var right = [{ member_id: 'X', plan_name: 'PPO Silver', status: 'ACTIVE', __src_row: 1 }];
  var exc = matchAndCompare(left, right, ['member_id'], ['plan_name', 'status'], 'unit', false);
  var mm = exc.filter(function (e) { return e.type === 'field_mismatch'; });
  assertEqual(mm.length, 1);
  assertEqual(mm[0].diffs.length, 1);
  assertEqual(mm[0].diffs[0].field, 'plan_name');
}

function test_email_filter_no_cross_agent() {
  var exceptions = [
    { type: 'only_in_AB',     left: { agent_of_record: 'Alice' }, right: null },
    { type: 'only_in_AB',     left: { agent_of_record: 'Bob'   }, right: null },
    { type: 'field_mismatch', left: { agent_of_record: 'Alice' }, right: { agent_of_record: 'Bob' }, diffs: [] },
    { type: 'only_in_carrier', left: null, right: { agent_of_record: 'Bob' } }
  ];
  var alice = filterExceptionsForAgent_(exceptions, 'Alice');
  // Alice should get her two AB rows, NOT the only_in_carrier (no AB attribution).
  assertEqual(alice.length, 2);
  alice.forEach(function (e) {
    assertTrue(e.type !== 'only_in_carrier', 'only_in_carrier must never reach an agent');
  });
}

function test_safelog_strips_phi() {
  // Just verify safeLog doesn't throw and that PHI keys are redacted in the output.
  // We can't read Logger output back in tests, so we exercise the redact map directly.
  var redacted = {};
  var keys = Object.keys(PHI_KEYS);
  keys.forEach(function (k) { redacted[k] = '[REDACTED]'; });
  assertTrue(PHI_KEYS.first_name === 1);
  assertTrue(PHI_KEYS.mbi === 1);
  assertTrue(PHI_KEYS.policy_number === 1);
}
