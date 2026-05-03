// Server-side header validation for uploads. Runs after every chunk so the
// first chunk (which carries the header row) immediately surfaces problems
// like a missing MBI column on an AgencyBloc report.

function validateUploadHeader(runId, sourceKey) {
  if (!runId || !sourceKey) return { ok: true, warnings: [], errors: [] };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SCRATCH_TAB_PREFIX + runId + '_' + sourceKey);
  if (!sh || sh.getLastRow() === 0) return { ok: true, warnings: [], errors: [] };

  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var mappings = getFieldMappings();
  var srcSpec = mappings.sources && mappings.sources[sourceKey];
  if (!srcSpec) {
    return { ok: false, errors: ['Unknown source key: ' + sourceKey], warnings: [] };
  }

  var errors = [];
  var warnings = [];

  // 1) header_required check (we already do this lazily inside normalize, but
  //    surfacing it during upload lets the UI block the user up front).
  var requiredHeaders = srcSpec.header_required || [];
  for (var i = 0; i < requiredHeaders.length; i++) {
    if (!headerHasColumn_(header, requiredHeaders[i])) {
      errors.push('Missing required column: "' + requiredHeaders[i] + '"');
    }
  }

  // 2) MBI presence check for AB sources (configured per-source in field_mappings.json).
  if (srcSpec.mbi_required) {
    var mbiAliases = (srcSpec.fields && srcSpec.fields.mbi && srcSpec.fields.mbi.columns) || ['MBI'];
    if (!resolveAlias_(header, mbiAliases)) {
      errors.push(
        'AgencyBloc report does not include an MBI column. Re-download the report ' +
        'with the MBI / Medicare Number field enabled, then re-upload.'
      );
    }
  }

  return { ok: errors.length === 0, errors: errors, warnings: warnings };
}

function resolveAlias_(headerRow, aliases) {
  var byNorm = {};
  for (var i = 0; i < headerRow.length; i++) byNorm[normalizeHeaderName(headerRow[i])] = i;
  for (var a = 0; a < aliases.length; a++) {
    if (byNorm[normalizeHeaderName(aliases[a])] !== undefined) return aliases[a];
  }
  return null;
}

// Server endpoint surfaced to the sidebar — wraps validateUploadHeader and
// stamps the result onto the run state so subsequent steps can read it.
function validateAndRecordUpload(runId, sourceKey) {
  var result = validateUploadHeader(runId, sourceKey);
  var state = loadRunState(runId);
  state.uploads = state.uploads || {};
  var existing = state.uploads[sourceKey] || {};
  existing.validated = true;
  existing.errors = result.errors || [];
  existing.warnings = result.warnings || [];
  existing.mbi_present = !(result.errors || []).some(function (e) { return e.indexOf('MBI') !== -1; });
  state.uploads[sourceKey] = existing;
  saveRunState(runId, state);
  return result;
}
