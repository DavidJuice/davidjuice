// Some carrier feeds carry multiple rows per member when historical policies
// (inactive prior coverage + active current coverage) coexist. We collapse
// each group to a single "current" row using a chained ordering:
//
//   1. compare each field in opts.latestBy (array, ISO dates sort lexicographically)
//   2. if every comparator field ties, prefer rows whose status matches the
//      earliest entry in opts.preferredStatus (ACTIVE > PENDING > INACTIVE...)
//   3. final tie-break: higher source row index (last-write-wins from the file)
//
// `latestBy` may be a string for the legacy single-field shape; it is
// promoted to an array internally.

function collapseHistory(rows, opts) {
  opts = opts || {};
  var groupBy = opts.groupBy || 'policy_number';
  var latestByList = opts.latestBy
    ? (Array.isArray(opts.latestBy) ? opts.latestBy : [opts.latestBy])
    : ['event_date'];
  var preferredStatus = (opts.preferredStatus || []).map(function (s) {
    return String(s).toUpperCase();
  });

  var byKey = {};
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var k = r[groupBy];
    if (!k) {
      // No group key — fall back to a unique synthetic key so we don't lose the row.
      k = '__nogroup_' + r.__src_row;
    }
    var current = byKey[k];
    if (!current) {
      byKey[k] = r;
      continue;
    }
    if (isNewer_(r, current, latestByList, preferredStatus)) {
      byKey[k] = r;
    }
  }
  var out = [];
  for (var key in byKey) out.push(byKey[key]);
  return out;
}

function isNewer_(candidate, current, latestByList, preferredStatus) {
  for (var i = 0; i < latestByList.length; i++) {
    var f = latestByList[i];
    var cv = candidate[f] || '';
    var nv = current[f] || '';
    if (cv > nv) return true;
    if (cv < nv) return false;
  }
  if (preferredStatus.length) {
    var cIdx = preferredStatus.indexOf(String(candidate.status || '').toUpperCase());
    var nIdx = preferredStatus.indexOf(String(current.status || '').toUpperCase());
    if (cIdx !== -1 && (nIdx === -1 || cIdx < nIdx)) return true;
    if (nIdx !== -1 && (cIdx === -1 || nIdx < cIdx)) return false;
  }
  return (candidate.__src_row || 0) > (current.__src_row || 0);
}

// Generic dispatcher invoked from the engine: applies collapse only if the
// source declares a `history` block in field_mappings.json.
function collapseIfNeeded(sourceKey, rows) {
  var mappings = getFieldMappings();
  var src = mappings.sources[sourceKey];
  if (!src || !src.history) return rows;
  return collapseHistory(rows, {
    groupBy: src.history.group_by,
    latestBy: src.history.latest_by,
    preferredStatus: src.history.preferred_status
  });
}
