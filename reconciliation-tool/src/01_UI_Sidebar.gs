// Sidebar launcher and template helpers.

function showSidebar() {
  var t = HtmlService.createTemplateFromFile('Sidebar');
  var html = t.evaluate()
    .setTitle('Reconciliation')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(html);
}

// Used inside .html files via <?!= include('Styles') ?>.
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// Server endpoint: returns the catalog of reconciliation types for Step 3.
function getReconciliationCatalog() {
  return getReconciliationTypes();
}

// Server endpoint: starts a fresh run id for the user. Called when the sidebar
// opens so the client has a stable handle for chunked uploads.
function beginNewRun() {
  PropertiesService.getDocumentProperties().deleteProperty(PROP_CURRENT_RUN_ID);
  return { runId: getOrCreateCurrentRunId_() };
}

// Server endpoint: list agents detected in the AB Individual upload.
function listDetectedAgents(runId) {
  return scanAgentsForRun(runId);
}
