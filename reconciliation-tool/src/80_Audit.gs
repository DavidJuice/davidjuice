// Append-only audit log + PHI-safe logging wrapper.
// Anything that would touch Logger MUST go through safeLog so that names,
// DOBs, MBIs, etc. cannot accidentally land in Stackdriver.

var PHI_KEYS = {
  first_name: 1, last_name: 1, dob: 1,
  mbi: 1, member_id: 1, policy_number: 1,
  address: 1, phone: 1, email: 1, ssn: 1
};

function safeLog(msg, ctx) {
  try {
    var safe = {};
    if (ctx && typeof ctx === 'object') {
      var keys = Object.keys(ctx);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (PHI_KEYS[k]) {
          safe[k] = '[REDACTED]';
        } else {
          var v = ctx[k];
          if (v && typeof v === 'object') {
            safe[k] = '[object]';
          } else {
            safe[k] = v;
          }
        }
      }
    }
    Logger.log('%s %s', msg, JSON.stringify(safe));
  } catch (e) {
    Logger.log('safeLog failure: ' + e);
  }
}

function getAuditSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB_AUDIT_LOG);
  if (!sh) {
    sh = ss.insertSheet(TAB_AUDIT_LOG);
    sh.appendRow([
      'timestamp', 'user_email', 'run_id', 'event',
      'source_files', 'file_sha256s', 'row_counts',
      'agents_selected', 'checks_selected',
      'output_sheet_url', 'duration_ms', 'status', 'detail'
    ]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function audit(event, runId, payload) {
  payload = payload || {};
  var sh = getAuditSheet_();
  sh.appendRow([
    new Date(),
    Session.getActiveUser().getEmail() || '(unknown)',
    runId || '',
    event,
    (payload.source_files || []).join('; '),
    (payload.file_sha256s || []).join('; '),
    JSON.stringify(payload.row_counts || {}),
    (payload.agents_selected || []).join('; '),
    (payload.checks_selected || []).join('; '),
    payload.output_sheet_url || '',
    payload.duration_ms || '',
    payload.status || '',
    payload.detail || ''
  ]);
}
