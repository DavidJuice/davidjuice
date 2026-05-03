// Trigger management for the chunked runner and the daily retention job.
//
// We never leave more than one continueRun trigger pending at a time. A
// watchdog clears any continueRun trigger older than 30 minutes whose run is
// not making progress, to prevent leaks.

var CONTINUE_RUN_HANDLER = 'continueRun';
var RETENTION_HANDLER    = 'runRetention';
var WATCHDOG_HANDLER     = 'watchdogTriggers';

function scheduleContinueRun_() {
  clearContinueRunTriggers_();
  ScriptApp.newTrigger(CONTINUE_RUN_HANDLER).timeBased().after(1000).create();
}

function clearContinueRunTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === CONTINUE_RUN_HANDLER) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function ensureRetentionTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === RETENTION_HANDLER) return;
  }
  ScriptApp.newTrigger(RETENTION_HANDLER).timeBased().everyDays(1).atHour(2).create();
}

function ensureWatchdogTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === WATCHDOG_HANDLER) return;
  }
  ScriptApp.newTrigger(WATCHDOG_HANDLER).timeBased().everyHours(1).create();
}

function watchdogTriggers() {
  var props = PropertiesService.getDocumentProperties();
  var runId = props.getProperty(PROP_CURRENT_RUN_ID);
  if (!runId) {
    clearContinueRunTriggers_();
    return;
  }
  var state = loadRunState(runId);
  if (!state) {
    clearContinueRunTriggers_();
    props.deleteProperty(PROP_CURRENT_RUN_ID);
    return;
  }
  var startedAt = state.startedAt ? new Date(state.startedAt).getTime() : 0;
  if (state.status !== 'running') return;
  if (startedAt && (Date.now() - startedAt) > 30 * 60 * 1000) {
    safeLog('watchdog: stale run detected', { runId: runId });
    state.status = 'failed';
    state.errors = (state.errors || []).concat('watchdog: stuck > 30min');
    saveRunState(runId, state);
    audit('run_failed', runId, { status: 'stale', detail: 'watchdog cleared trigger' });
    clearContinueRunTriggers_();
  }
}
