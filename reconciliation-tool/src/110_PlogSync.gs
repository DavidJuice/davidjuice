// Plog Sync tool — scaffold.
//
// Plan: AgencyBloc emails scheduled CSV reports to a Workspace service
// mailbox. A 12-hour time-driven trigger reads new messages via GmailApp,
// decodes the attached CSVs, snapshots them to a hidden tab inside the Master
// Sheet, diffs each new snapshot against the prior one, classifies the
// resulting field deltas as Plog events (newborn / onboard / switch /
// renewal / cancel / transfer), and appends them to the Plog tracking Sheet.
//
// Implementation parked pending:
//   - Confirmed AB scheduled-email setup (sender address, subject filter,
//     report list, schedule).
//   - The Plog tracking Sheet's column schema (so we know what to append).
//   - The mapping table from AB field deltas to event types.
//
// What's wired today:
//   - installPlogSync() / uninstallPlogSync() install or remove the trigger.
//   - plogSyncTick() is the scheduled handler; it currently logs and exits.

var PLOG_SYNC_TRIGGER = 'plogSyncTick';
var PLOG_SYNC_INTERVAL_HOURS = 12;

function installPlogSync() {
  uninstallPlogSync();
  ScriptApp.newTrigger(PLOG_SYNC_TRIGGER)
    .timeBased()
    .everyHours(PLOG_SYNC_INTERVAL_HOURS)
    .create();
  audit('plog_sync_installed', '', { interval_hours: PLOG_SYNC_INTERVAL_HOURS });
}

function uninstallPlogSync() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === PLOG_SYNC_TRIGGER) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function plogSyncTick() {
  // Resolve config (mailbox filter, Plog Sheet ID, event mapping).
  var cfg = getPlogSyncConfig_();
  if (!cfg || !cfg.from || !cfg.subject_substring) {
    safeLog('plog_sync_skipped', { reason: 'config not set' });
    return;
  }
  // TODO: implement once spec lands.
  //   var threads = GmailApp.search(
  //     'from:' + cfg.from + ' subject:"' + cfg.subject_substring + '" is:unread newer_than:1d'
  //   );
  //   for each thread → for each message → for each CSV attachment:
  //     parse, snapshot to _plog_snapshots, diff against prior,
  //     classify events, append to Plog sheet, mark message read.
  safeLog('plog_sync_tick', { detail: 'not yet implemented' });
}

function getPlogSyncConfig_() {
  var override = readJsonFromDriveConfig_('plog_sync.json');
  return override || (typeof EMBEDDED_PLOG_SYNC !== 'undefined' ? EMBEDDED_PLOG_SYNC : null);
}
