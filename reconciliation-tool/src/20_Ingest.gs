// Server-side endpoints for chunked CSV upload from the sidebar.
// Each chunk arrives as an array of pre-parsed rows (the client parses CSV with
// the same RFC-4180 logic as 90_Util_Csv.gs to keep payloads small and avoid
// re-parsing huge strings server-side).
//
// Rows are appended to a hidden scratch tab named _scratch_<runId>_<source>
// in the Master Control Sheet. We use a Sheet (not CacheService) because the
// active Sheet's storage is the only place big enough for 20k rows that
// survives across executions (CacheService caps at 100KB per key).

function startUpload(sourceKey, fileName) {
  if (!sourceKey) throw new Error('sourceKey required');
  var runId = getOrCreateCurrentRunId_();
  ensureScratchTab_(runId, sourceKey, /*reset*/true);
  var state = loadRunState(runId);
  state.uploads = state.uploads || {};
  state.uploads[sourceKey] = {
    fileName: fileName || '',
    chunks: 0,
    rows: 0,
    headerCaptured: false,
    sha256_partial: ''
  };
  saveRunState(runId, state);
  return { runId: runId };
}

function receiveChunk(runId, sourceKey, chunkIndex, rows, isFinal, chunkSha256) {
  if (!runId || !sourceKey) throw new Error('runId and sourceKey required');
  var sh = ensureScratchTab_(runId, sourceKey, /*reset*/false);
  if (rows && rows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  var state = loadRunState(runId);
  var u = (state.uploads && state.uploads[sourceKey]) || { chunks: 0, rows: 0 };
  u.chunks++;
  u.rows += (rows ? rows.length : 0);
  if (chunkSha256) {
    u.sha256_partial = sha256Hex((u.sha256_partial || '') + chunkSha256);
  }
  if (!u.headerCaptured && rows && rows.length) {
    u.headerCaptured = true;
  }
  state.uploads = state.uploads || {};
  state.uploads[sourceKey] = u;
  if (isFinal) {
    u.complete = true;
    u.sha256 = u.sha256_partial;
    safeLog('upload complete', { sourceKey: sourceKey, rows: u.rows, chunks: u.chunks });
  }
  saveRunState(runId, state);
  return { ok: true, rows: u.rows, complete: !!u.complete };
}

function getUploadStatus(runId) {
  var state = loadRunState(runId);
  return state.uploads || {};
}

// --- helpers ---

function ensureScratchTab_(runId, sourceKey, reset) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = SCRATCH_TAB_PREFIX + runId + '_' + sourceKey;
  var sh = ss.getSheetByName(name);
  if (sh && reset) {
    ss.deleteSheet(sh);
    sh = null;
  }
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.hideSheet();
  }
  return sh;
}

function readScratchRows(runId, sourceKey) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SCRATCH_TAB_PREFIX + runId + '_' + sourceKey);
  if (!sh || sh.getLastRow() === 0) return [];
  return sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
}

function deleteScratchTabs(runId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var prefix = SCRATCH_TAB_PREFIX + runId + '_';
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().indexOf(prefix) === 0) {
      ss.deleteSheet(sheets[i]);
    }
  }
}

function getOrCreateCurrentRunId_() {
  var props = PropertiesService.getDocumentProperties();
  var existing = props.getProperty(PROP_CURRENT_RUN_ID);
  if (existing) return existing;
  var runId = generateRunId_();
  props.setProperty(PROP_CURRENT_RUN_ID, runId);
  return runId;
}

function generateRunId_() {
  var d = new Date();
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' +
         pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '_' +
         Math.random().toString(36).slice(2, 6);
}
