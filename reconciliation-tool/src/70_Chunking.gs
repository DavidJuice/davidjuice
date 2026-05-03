// Chunked re-entrant runner. Single-shot when small; trigger-driven when large.
//
// Why: Apps Script execution is hard-capped at 6 minutes. We budget 4 minutes
// per execution and re-schedule continueRun if more work remains.
//
// State persistence:
//   - Small state: PropertiesService.getDocumentProperties() (per-Sheet, durable).
//   - Large intermediate (uploaded rows): hidden _scratch_ tabs in the Sheet.

function startRun(runId, agentsSelected, checksSelected) {
  if (!runId) throw new Error('runId required');
  if (!agentsSelected || !agentsSelected.length) throw new Error('At least one agent required');
  if (!checksSelected || !checksSelected.length) throw new Error('At least one check required');

  var state = loadRunState(runId) || {};
  state.runId = runId;
  state.agents = agentsSelected;
  state.checks = checksSelected;
  state.startedAt = new Date().toISOString();
  state.phase = 'normalize';
  state.percent = 0;
  state.status = 'running';
  state.errors = [];
  saveRunState(runId, state);

  audit('run_started', runId, {
    agents_selected: agentsSelected,
    checks_selected: checksSelected,
    source_files: Object.keys(state.uploads || {}),
    file_sha256s: Object.keys(state.uploads || {}).map(function (k) { return (state.uploads[k] && state.uploads[k].sha256) || ''; }),
    row_counts: rowCounts_(state.uploads || {})
  });

  var settings = getSettings();
  var totalRows = totalUploadedRows_(state.uploads || {});
  var estSeconds = totalRows * checksSelected.length * 0.0008;
  var threshold = settings.single_shot_threshold_seconds || 240;

  if (estSeconds < threshold) {
    return executeRunInline_(runId);
  }
  scheduleContinueRun_();
  return { runId: runId, mode: 'chunked', estSeconds: Math.round(estSeconds) };
}

function executeRunInline_(runId) {
  try {
    var startedAt = Date.now();
    var state = loadRunState(runId);
    var result = runChecksForRun(runId, state.agents, state.checks);
    state.phase = 'write';
    state.percent = 80;
    saveRunState(runId, state);

    var workbook = buildOutputWorkbook(runId, result.exceptions, state.agents, state.checks, state);
    state.outputUrl = workbook.url;
    state.outputId  = workbook.id;
    state.phase = 'email';
    state.percent = 95;
    saveRunState(runId, state);

    var sent = emailPerAgent(runId, result.exceptions, state.agents, workbook.url);
    state.phase = 'done';
    state.percent = 100;
    state.status = 'completed';
    state.finishedAt = new Date().toISOString();
    state.emailedTo = sent;
    saveRunState(runId, state);

    audit('run_completed', runId, {
      output_sheet_url: workbook.url,
      duration_ms: Date.now() - startedAt,
      status: 'ok',
      detail: 'exceptions=' + result.exceptions.length + ' emails=' + sent.length
    });
    deleteScratchTabs(runId);
    PropertiesService.getDocumentProperties().deleteProperty(PROP_CURRENT_RUN_ID);
    return { runId: runId, mode: 'inline', url: workbook.url, exceptions: result.exceptions.length };
  } catch (e) {
    handleRunFailure_(runId, e);
    throw e;
  }
}

// Trigger-target. Picks up the current run id from properties and executes.
function continueRun() {
  var props = PropertiesService.getDocumentProperties();
  var runId = props.getProperty(PROP_CURRENT_RUN_ID);
  if (!runId) {
    clearContinueRunTriggers_();
    return;
  }
  // For now we use a single-step "do everything" approach inside the 4-min
  // budget. The architecture is in place to break this into per-check or
  // per-chunk advances later if needed; for medium data sizes (≤20k rows)
  // a single execution typically fits.
  try {
    var result = executeRunInline_(runId);
    clearContinueRunTriggers_();
    return result;
  } catch (e) {
    var state = loadRunState(runId) || { runId: runId };
    state.status = 'failed';
    state.errors = (state.errors || []).concat(String(e));
    saveRunState(runId, state);
    clearContinueRunTriggers_();
  }
}

function getRunStatus(runId) {
  var state = loadRunState(runId) || { runId: runId, phase: 'unknown', percent: 0, status: 'unknown' };
  return {
    runId: state.runId,
    phase: state.phase,
    percent: state.percent || 0,
    status: state.status || 'unknown',
    outputUrl: state.outputUrl || null,
    errors: state.errors || []
  };
}

// --- state helpers ---

function loadRunState(runId) {
  if (!runId) return null;
  var raw = PropertiesService.getDocumentProperties().getProperty(PROP_RUN_STATE_PREFIX + runId);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function saveRunState(runId, state) {
  if (!runId) return;
  PropertiesService.getDocumentProperties().setProperty(PROP_RUN_STATE_PREFIX + runId, JSON.stringify(state));
}

function deleteRunState(runId) {
  PropertiesService.getDocumentProperties().deleteProperty(PROP_RUN_STATE_PREFIX + runId);
}

function handleRunFailure_(runId, err) {
  var state = loadRunState(runId) || { runId: runId };
  state.status = 'failed';
  state.errors = (state.errors || []).concat(String(err && err.stack || err));
  saveRunState(runId, state);
  audit('run_failed', runId, { status: 'failed', detail: String(err) });
  // Leave scratch tabs in place for debugging; admin can clear via menu.
}

function totalUploadedRows_(uploads) {
  var n = 0;
  for (var k in uploads) n += (uploads[k].rows || 0);
  return n;
}

function rowCounts_(uploads) {
  var out = {};
  for (var k in uploads) out[k] = uploads[k].rows || 0;
  return out;
}
