// Config-driven dispatcher for reconciliation checks. New check types added to
// reconciliation_types.json work automatically as long as their `left` and
// `right` source keys exist in field_mappings.json.

function runChecksForRun(runId, agentsSelected, checkIds) {
  var canonical = {};
  var typesNeeded = checkIds.map(getReconciliationTypeById);

  // Collect every source we'll need.
  var neededSources = {};
  for (var i = 0; i < typesNeeded.length; i++) {
    neededSources[typesNeeded[i].left] = true;
    neededSources[typesNeeded[i].right] = true;
  }

  // Normalize + (optionally) collapse each.
  for (var srcKey in neededSources) {
    var raw = readScratchRows(runId, srcKey);
    if (!raw || raw.length < 2) {
      throw new Error('Required upload missing or empty: ' + srcKey);
    }
    var rows = normalize(srcKey, raw);
    rows = collapseIfNeeded(srcKey, rows);
    canonical[srcKey] = rows;
  }

  // Run each check, filtering left side to selected agents.
  var allExceptions = [];
  for (var t = 0; t < typesNeeded.length; t++) {
    var cfg = typesNeeded[t];
    var left = canonical[cfg.left];
    var right = canonical[cfg.right];
    var leftFiltered = filterByAgents_(left, agentsSelected);
    var exc = matchAndCompare(
      leftFiltered,
      right,
      cfg.match_keys || ['member_id', 'policy_number', 'name_dob'],
      cfg.compare_fields || [],
      cfg.id,
      !!cfg.allow_fuzzy
    );
    allExceptions = allExceptions.concat(exc);
  }
  return { exceptions: allExceptions, canonical: canonical };
}

function filterByAgents_(rows, agents) {
  if (!agents || !agents.length) return rows;
  var set = {};
  for (var i = 0; i < agents.length; i++) set[normalizeAgentName_(agents[i])] = true;
  var out = [];
  for (var r = 0; r < rows.length; r++) {
    var a = normalizeAgentName_(rows[r].agent_of_record);
    if (set[a]) out.push(rows[r]);
  }
  return out;
}

function normalizeAgentName_(s) {
  if (!s) return '';
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}
