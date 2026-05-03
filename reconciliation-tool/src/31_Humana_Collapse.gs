// Humana's Book of Business has multiple rows per policy, each representing
// an event in the policy's history. We keep only the row with the latest
// event_date for each policy_number.
//
// Tie-breaks (in order):
//   1. higher event_date string (ISO sorts lexicographically)
//   2. higher source row index (last-write-wins from the file)

function collapseHistory(rows, opts) {
  opts = opts || {};
  var groupBy = opts.groupBy || 'policy_number';
  var latestBy = opts.latestBy || 'event_date';
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
    var newer = (r[latestBy] || '');
    var have  = (current[latestBy] || '');
    if (newer > have || (newer === have && (r.__src_row || 0) > (current.__src_row || 0))) {
      byKey[k] = r;
    }
  }
  var out = [];
  for (var key in byKey) out.push(byKey[key]);
  return out;
}

// Generic dispatcher invoked from the engine: applies collapse only if the
// source declares a `history` block in field_mappings.json.
function collapseIfNeeded(sourceKey, rows) {
  var mappings = getFieldMappings();
  var src = mappings.sources[sourceKey];
  if (!src || !src.history) return rows;
  return collapseHistory(rows, {
    groupBy: src.history.group_by,
    latestBy: src.history.latest_by
  });
}
