// Scans the AB Individual scratch tab for unique agent_of_record values.
// Returns [{name, count}] sorted by count descending. Used by Step 2 of the UI.

function scanAgentsForRun(runId) {
  var raw = readScratchRows(runId, 'ab_individual');
  if (!raw || raw.length < 2) return [];
  var mappings = getFieldMappings();
  var src = mappings.sources['ab_individual'];
  if (!src) throw new Error('ab_individual mapping missing');

  var headerIndex = resolveHeaderIndex_(raw[0], src.fields);
  var idx = headerIndex['agent_of_record'];
  if (idx === undefined || idx < 0) {
    return []; // surfaced to UI as "no agent column detected"
  }

  var counts = {};
  for (var r = 1; r < raw.length; r++) {
    var v = raw[r][idx];
    if (v === '' || v === null || v === undefined) continue;
    var name = String(v).trim();
    if (!name) continue;
    counts[name] = (counts[name] || 0) + 1;
  }
  var out = [];
  for (var k in counts) out.push({ name: k, count: counts[k] });
  out.sort(function (a, b) { return b.count - a.count; });
  return out;
}
