// Builds the per-run results Sheet inside /Reconciliation Tool/Runs/.
// Tabs: Dashboard, Summary, Exceptions_All, Agent_<name>, OnlyInAB,
// OnlyInCarrier, FieldMismatch, FuzzyReview, RunMetadata.

function buildOutputWorkbook(runId, exceptions, agentsSelected, checksSelected, runMeta) {
  var folder = getOrCreateRunsFolder_();
  var who = (Session.getActiveUser().getEmail() || 'unknown').split('@')[0];
  var name = runId + '_' + who;
  var ss = SpreadsheetApp.create(name);
  // Move the new file into the Runs folder.
  var file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  // Lock down sharing to the Shared Drive ACL only.
  try {
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  } catch (e) {
    // setSharing can throw on Shared Drives (ACL inherited); not fatal.
    safeLog('setSharing skipped', { error: String(e) });
  }

  // Remove the default 'Sheet1' once we've added our own tabs.
  var defaultSheet = ss.getSheets()[0];

  writeRunMetadata_(ss, runId, agentsSelected, checksSelected, runMeta);
  writeExceptionsAll_(ss, exceptions);
  writeCategoricalTabs_(ss, exceptions);
  writePerAgentTabs_(ss, exceptions, agentsSelected);
  writeSummary_(ss, exceptions, checksSelected);
  writeDashboard_(ss, exceptions, agentsSelected, checksSelected);

  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  // Reorder tabs so Dashboard is first.
  var dash = ss.getSheetByName('Dashboard');
  if (dash) ss.setActiveSheet(dash);

  appendRunIndex_(runId, ss.getUrl());
  return { url: ss.getUrl(), id: ss.getId() };
}

// --- writers ---

function writeDashboard_(ss, exceptions, agentsSelected, checksSelected) {
  var sh = ss.insertSheet('Dashboard');
  sh.getRange('A1').setValue('Reconciliation Run').setFontSize(18).setFontWeight('bold');
  sh.getRange('A2').setValue('Generated: ' + new Date().toString());
  sh.getRange('A3').setValue('Agents: ' + (agentsSelected || []).join(', '));
  sh.getRange('A4').setValue('Checks: ' + (checksSelected || []).join(', '));

  var byType = countBy_(exceptions, function (e) { return e.type; });
  var byCheck = countBy_(exceptions, function (e) { return e.check; });
  var byAgent = countBy_(exceptions, function (e) {
    return (e.left && e.left.agent_of_record) ||
           (e.right && e.right.agent_of_record) || '(unknown)';
  });

  var row = 6;
  sh.getRange(row, 1).setValue('Counts by exception type').setFontWeight('bold');
  row++;
  sh.getRange(row, 1, 1, 2).setValues([['Type', 'Count']]).setFontWeight('bold');
  row++;
  for (var t in byType) {
    sh.getRange(row, 1, 1, 2).setValues([[t, byType[t]]]);
    row++;
  }

  row += 1;
  sh.getRange(row, 1).setValue('Counts by check').setFontWeight('bold');
  row++;
  sh.getRange(row, 1, 1, 2).setValues([['Check', 'Count']]).setFontWeight('bold');
  row++;
  for (var c in byCheck) {
    sh.getRange(row, 1, 1, 2).setValues([[c, byCheck[c]]]);
    row++;
  }

  row += 1;
  sh.getRange(row, 1).setValue('Counts by agent').setFontWeight('bold');
  row++;
  sh.getRange(row, 1, 1, 2).setValues([['Agent', 'Count']]).setFontWeight('bold');
  row++;
  for (var a in byAgent) {
    sh.getRange(row, 1, 1, 2).setValues([[a, byAgent[a]]]);
    row++;
  }

  sh.autoResizeColumns(1, 2);
  sh.setFrozenRows(5);
}

function writeSummary_(ss, exceptions, checksSelected) {
  var sh = ss.insertSheet('Summary');
  var header = ['check', 'only_in_AB', 'only_in_carrier', 'field_mismatch', 'fuzzy_review_needed', 'total'];
  sh.appendRow(header);
  sh.setFrozenRows(1);
  for (var i = 0; i < checksSelected.length; i++) {
    var c = checksSelected[i];
    var counts = { only_in_AB: 0, only_in_carrier: 0, field_mismatch: 0, fuzzy_review_needed: 0 };
    for (var j = 0; j < exceptions.length; j++) {
      if (exceptions[j].check !== c) continue;
      counts[exceptions[j].type] = (counts[exceptions[j].type] || 0) + 1;
    }
    var total = counts.only_in_AB + counts.only_in_carrier + counts.field_mismatch + counts.fuzzy_review_needed;
    sh.appendRow([c, counts.only_in_AB, counts.only_in_carrier, counts.field_mismatch, counts.fuzzy_review_needed, total]);
  }
  sh.autoResizeColumns(1, header.length);
}

function writeExceptionsAll_(ss, exceptions) {
  var sh = ss.insertSheet('Exceptions_All');
  var rows = exceptions.map(exceptionToFlatRow_);
  writeFlatExceptions_(sh, rows);
}

function writeCategoricalTabs_(ss, exceptions) {
  var groups = {
    OnlyInAB: [], OnlyInCarrier: [], FieldMismatch: [], FuzzyReview: []
  };
  for (var i = 0; i < exceptions.length; i++) {
    var e = exceptions[i];
    if (e.type === EXCEPTION_TYPES.ONLY_IN_AB)        groups.OnlyInAB.push(e);
    else if (e.type === EXCEPTION_TYPES.ONLY_IN_CARRIER) groups.OnlyInCarrier.push(e);
    else if (e.type === EXCEPTION_TYPES.FIELD_MISMATCH)  groups.FieldMismatch.push(e);
    else if (e.type === EXCEPTION_TYPES.FUZZY_REVIEW)    groups.FuzzyReview.push(e);
  }
  for (var name in groups) {
    var sh = ss.insertSheet(name);
    var rows = groups[name].map(exceptionToFlatRow_);
    writeFlatExceptions_(sh, rows);
  }
}

function writePerAgentTabs_(ss, exceptions, agentsSelected) {
  for (var i = 0; i < agentsSelected.length; i++) {
    var agent = agentsSelected[i];
    var name = ('Agent_' + agent).slice(0, 95).replace(/[\\\/\?\*\[\]]/g, '_');
    var sh = ss.insertSheet(name);
    var filtered = filterExceptionsForAgent_(exceptions, agent);
    var rows = filtered.map(exceptionToFlatRow_);
    writeFlatExceptions_(sh, rows);
  }
}

function writeRunMetadata_(ss, runId, agentsSelected, checksSelected, runMeta) {
  var sh = ss.insertSheet('RunMetadata');
  sh.appendRow(['key', 'value']);
  sh.appendRow(['run_id', runId]);
  sh.appendRow(['user', Session.getActiveUser().getEmail() || '(unknown)']);
  sh.appendRow(['timestamp', new Date().toString()]);
  sh.appendRow(['agents_selected', (agentsSelected || []).join('; ')]);
  sh.appendRow(['checks_selected', (checksSelected || []).join('; ')]);
  if (runMeta && runMeta.uploads) {
    for (var src in runMeta.uploads) {
      var u = runMeta.uploads[src];
      sh.appendRow(['upload:' + src + ':rows', u.rows]);
      sh.appendRow(['upload:' + src + ':sha256', u.sha256 || '']);
      sh.appendRow(['upload:' + src + ':filename', u.fileName || '']);
    }
  }
  sh.setFrozenRows(1);
}

// --- helpers ---

function exceptionToFlatRow_(e) {
  var L = e.left || {};
  var R = e.right || {};
  var diffs = e.diffs || [];
  var primary = diffs[0] || { field: '', left: '', right: '' };
  return {
    check: e.check,
    type: e.type,
    matched_by: e.matched_by || '',
    fuzzy_score: e.fuzzy_score || '',
    policy_number: L.policy_number || R.policy_number || '',
    member_id:     L.member_id || R.member_id || '',
    mbi:           L.mbi || R.mbi || '',
    first_name:    L.first_name || R.first_name || '',
    last_name:     L.last_name || R.last_name || '',
    dob:           L.dob || R.dob || '',
    plan_name:     L.plan_name || R.plan_name || '',
    status:        L.status || R.status || '',
    effective_date: L.effective_date || R.effective_date || '',
    term_date:     L.term_date || R.term_date || '',
    agent_of_record: L.agent_of_record || R.agent_of_record || '',
    carrier:       L.carrier || R.carrier || '',
    mismatch_field: primary.field || '',
    left_value:    primary.left  === undefined ? '' : primary.left,
    right_value:   primary.right === undefined ? '' : primary.right,
    source_row_index: (L.__src_row || R.__src_row || ''),
    all_diffs:     diffs.length > 1 ? JSON.stringify(diffs) : ''
  };
}

function writeFlatExceptions_(sh, rows) {
  var header = [
    'check', 'type', 'matched_by', 'fuzzy_score',
    'policy_number', 'member_id', 'mbi',
    'first_name', 'last_name', 'dob',
    'plan_name', 'status', 'effective_date', 'term_date',
    'agent_of_record', 'carrier',
    'mismatch_field', 'left_value', 'right_value',
    'source_row_index', 'all_diffs'
  ];
  sh.appendRow(header);
  sh.setFrozenRows(1);
  if (!rows.length) return;
  var matrix = rows.map(function (r) {
    return header.map(function (h) { return r[h] === undefined || r[h] === null ? '' : r[h]; });
  });
  sh.getRange(2, 1, matrix.length, header.length).setValues(matrix);
}

function filterExceptionsForAgent_(exceptions, agentName) {
  var key = normalizeAgentName_(agentName);
  var out = [];
  for (var i = 0; i < exceptions.length; i++) {
    var e = exceptions[i];
    var aor = (e.left && e.left.agent_of_record) || (e.right && e.right.agent_of_record) || '';
    if (normalizeAgentName_(aor) === key) out.push(e);
  }
  return out;
}

function countBy_(arr, keyFn) {
  var out = {};
  for (var i = 0; i < arr.length; i++) {
    var k = keyFn(arr[i]) || '(none)';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function appendRunIndex_(runId, url) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB_RUN_INDEX);
  if (!sh) {
    sh = ss.insertSheet(TAB_RUN_INDEX);
    sh.appendRow(['run_id', 'timestamp', 'user', 'output_sheet_url']);
    sh.setFrozenRows(1);
  }
  sh.appendRow([runId, new Date(), Session.getActiveUser().getEmail() || '', url]);
}

function getOrCreateRunsFolder_() {
  var settings = getSettings();
  var ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  var parents = ssFile.getParents();
  if (!parents.hasNext()) throw new Error('Master Sheet has no parent folder; place it in /Reconciliation Tool/.');
  var toolFolder = parents.next();
  return getOrCreateChildFolder_(toolFolder, settings.output_folder_name || 'Runs');
}

function getOrCreateChildFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}
