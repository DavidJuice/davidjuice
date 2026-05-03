// Config-driven dispatcher for reconciliation checks. New check types added to
// reconciliation_types.json work automatically as long as their `left` and
// `right` source keys exist in field_mappings.json — or, for the AB-only
// engine, just `required_uploads`.

function runChecksForRun(runId, agentsSelected, checkIds) {
  var canonical = {};
  var typesNeeded = checkIds.map(getReconciliationTypeById);

  // Collect every source we'll need across all selected checks.
  var neededSources = {};
  for (var i = 0; i < typesNeeded.length; i++) {
    var cfg = typesNeeded[i];
    if (cfg.left)  neededSources[cfg.left]  = true;
    if (cfg.right) neededSources[cfg.right] = true;
    (cfg.required_uploads || []).forEach(function (s) { neededSources[s] = true; });
    (cfg.optional_uploads || []).forEach(function (s) {
      // Only mark optional uploads as needed if they were actually uploaded.
      if (hasScratchTab_(runId, s)) neededSources[s] = true;
    });
  }

  // Normalize + (optionally) collapse each.
  for (var srcKey in neededSources) {
    var raw = readScratchRows(runId, srcKey);
    if (!raw || raw.length < 2) {
      // Optional uploads are allowed to be empty; skip silently. Required ones
      // were validated in the UI but double-check here.
      var isOptional = false;
      for (var t = 0; t < typesNeeded.length; t++) {
        if ((typesNeeded[t].optional_uploads || []).indexOf(srcKey) !== -1) {
          isOptional = true;
          break;
        }
      }
      if (isOptional) {
        canonical[srcKey] = [];
        continue;
      }
      throw new Error('Required upload missing or empty: ' + srcKey);
    }
    var rows = normalize(srcKey, raw);
    rows = collapseIfNeeded(srcKey, rows);
    canonical[srcKey] = rows;
  }

  // Run each check.
  var allExceptions = [];
  for (var t2 = 0; t2 < typesNeeded.length; t2++) {
    var cfg2 = typesNeeded[t2];
    if (cfg2.engine === 'ab_only') {
      var rule_exceptions = runAbOnlyRules(
        canonical[cfg2.left || 'ab_individual'] || canonical['ab_individual'] || [],
        canonical['ab_policy'] || [],
        canonical['ab_customer'] || []
      );
      // Tag each violation with the originating check id for tab routing.
      for (var rx = 0; rx < rule_exceptions.length; rx++) {
        rule_exceptions[rx].check = cfg2.id;
      }
      allExceptions = allExceptions.concat(rule_exceptions);
      continue;
    }

    var left = canonical[cfg2.left];
    var right = canonical[cfg2.right];
    var leftFiltered = filterByAgents_(left, agentsSelected);
    var exc = matchAndCompare(
      leftFiltered,
      right,
      cfg2.match_keys || ['mbi', 'member_id', 'policy_number', 'name_dob'],
      cfg2.compare_fields || [],
      cfg2.id,
      !!cfg2.allow_fuzzy,
      cfg2.skip_keys || []
    );
    allExceptions = allExceptions.concat(exc);

    // BoB-as-source-of-truth: any right-side row with active status whose AB
    // counterpart is missing OR not enrolled-as-client gets flagged as a
    // separate exception type. We re-derive this from the matchAndCompare
    // output rather than re-scanning, to preserve the matched_by trail.
    if (cfg2.bob_source_of_truth) {
      var bobExc = bobSourceOfTruthFlags_(
        cfg2,
        canonical[cfg2.right] || [],
        canonical[cfg2.left]  || [],
        canonical['ab_policy'] || [],
        exc
      );
      allExceptions = allExceptions.concat(bobExc);
    }
  }
  return { exceptions: allExceptions, canonical: canonical };
}

function hasScratchTab_(runId, sourceKey) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SCRATCH_TAB_PREFIX + runId + '_' + sourceKey);
  return !!(sh && sh.getLastRow() > 1);
}

function bobSourceOfTruthFlags_(cfg, bobRows, abIndividuals, abPolicies, matchExceptions) {
  var out = [];
  var ruleCfg = getAbOnlyRulesConfig_();
  var active = upperSet_(ruleCfg.active_status_values);

  // Index AB-side individuals + active policies by member_id and by name+dob
  // for second-pass matching beyond what matchAndCompare did.
  var indByKey = {};
  for (var i = 0; i < abIndividuals.length; i++) {
    var k = identityKey_(abIndividuals[i]);
    if (k) indByKey[k] = abIndividuals[i];
  }
  var policiesByKey = {};
  for (var p = 0; p < abPolicies.length; p++) {
    if (!active[String(abPolicies[p].status || '').toUpperCase()]) continue;
    var pk = identityKey_(abPolicies[p]);
    if (!pk) continue;
    if (!policiesByKey[pk]) policiesByKey[pk] = [];
    policiesByKey[pk].push(abPolicies[p]);
  }

  for (var b = 0; b < bobRows.length; b++) {
    var bob = bobRows[b];
    if (!active[String(bob.status || '').toUpperCase()]) continue;
    var key = identityKey_(bob);
    var ind = key ? indByKey[key] : null;
    var hasActiveAbPolicy = key ? !!(policiesByKey[key] && policiesByKey[key].length) : false;
    var typeNorm = ind ? normalizeIndividualType_(ind.individual_type, ruleCfg) : '';
    var statusNorm = ind ? String(ind.status || '').toUpperCase() : '';

    var reason = '';
    if (!ind) {
      reason = 'active in ' + (cfg.right || 'BoB') + ' but no matching individual in AgencyBloc';
    } else if (typeNorm !== 'client' || statusNorm !== 'ENROLLED') {
      reason = 'active in ' + (cfg.right || 'BoB') + ' but AB individual is type=' + (ind.individual_type || '(blank)') + ' status=' + (ind.status || '(blank)');
    } else if (!hasActiveAbPolicy) {
      reason = 'active in ' + (cfg.right || 'BoB') + ' but AB has no active policy for this member';
    } else {
      continue;
    }

    out.push({
      check: cfg.id,
      type: EXCEPTION_TYPES.BOB_ACTIVE_AB_INACTIVE,
      severity: SEVERITY.ERROR,
      reason: reason,
      left: ind || null,
      right: bob,
      matched_by: ind ? 'derived' : null,
      diffs: []
    });
  }
  return out;
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
