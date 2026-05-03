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
    'test_safelog_strips_phi'
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
