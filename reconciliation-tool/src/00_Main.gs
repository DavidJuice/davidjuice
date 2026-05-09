// Entry points: menu, install, sidebar launcher.

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Reconciliation')
    .addItem('Open Tool', 'showSidebar')
    .addSeparator()
    .addItem('Install / Initialize', 'installTool')
    .addItem('Run All Tests', 'runAllTests')
    .addItem('Run Retention Now', 'runRetention')
    .addItem('Clear Stuck Run', 'clearStuckRun')
    .addSeparator()
    .addItem('Install IEP Monthly Email', 'installIepMonthly')
    .addItem('Uninstall IEP Monthly Email', 'uninstallIepMonthly')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
  installTool();
}

// First-run setup: creates required tabs, seeds Agents/Settings, registers
// daily retention + hourly watchdog triggers.
function installTool() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureTab_(ss, TAB_AGENTS, ['name', 'email', 'branch', 'active'], (EMBEDDED_AGENTS.agents || []).map(function (a) {
    return [a.name, a.email, a.branch, a.active === false ? false : true];
  }));
  ensureTab_(ss, TAB_FIELD_MAP, ['source', 'canonical_field', 'aliases', 'type'], buildFieldMapPreviewRows_());
  ensureTab_(ss, TAB_SETTINGS, ['key', 'value'], buildSettingsRows_());
  getAuditSheet_();
  ensureTab_(ss, TAB_RUN_INDEX, ['run_id', 'timestamp', 'user', 'output_sheet_url'], []);

  ensureRetentionTrigger();
  ensureWatchdogTrigger();

  audit('install', '', { detail: 'tool initialized' });
  SpreadsheetApp.getUi().alert('Reconciliation tool initialized. Edit the Agents tab with real names and emails before the first run.');
}

function clearStuckRun() {
  var props = PropertiesService.getDocumentProperties();
  var runId = props.getProperty(PROP_CURRENT_RUN_ID);
  clearContinueRunTriggers_();
  if (runId) {
    deleteRunState(runId);
    deleteScratchTabs(runId);
    props.deleteProperty(PROP_CURRENT_RUN_ID);
    audit('run_cleared', runId, { detail: 'manual clear from menu' });
  }
  SpreadsheetApp.getUi().alert('Cleared run state' + (runId ? (' (' + runId + ')') : '.'));
}

// --- helpers ---

function ensureTab_(ss, name, header, seedRows) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
    if (seedRows && seedRows.length) {
      sh.getRange(2, 1, seedRows.length, header.length).setValues(seedRows);
    }
  }
  return sh;
}

function buildSettingsRows_() {
  var rows = [];
  for (var k in EMBEDDED_SETTINGS) {
    if (k === 'version') continue;
    rows.push([k, EMBEDDED_SETTINGS[k]]);
  }
  return rows;
}

function buildFieldMapPreviewRows_() {
  var rows = [];
  var sources = (EMBEDDED_FIELD_MAPPINGS && EMBEDDED_FIELD_MAPPINGS.sources) || {};
  for (var src in sources) {
    var fields = sources[src].fields || {};
    for (var canon in fields) {
      var spec = fields[canon];
      var aliases = '';
      var type = '';
      if (spec && spec.constant !== undefined) {
        aliases = '(constant: ' + spec.constant + ')';
      } else if (Array.isArray(spec)) {
        aliases = spec.join(', ');
      } else if (spec && spec.columns) {
        aliases = spec.columns.join(', ');
        type = spec.type || '';
      }
      rows.push([src, canon, aliases, type]);
    }
  }
  return rows;
}
