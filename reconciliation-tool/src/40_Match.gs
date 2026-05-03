// Match-key fallback ladder + field comparison.
//
// matchAndCompare(left, right, matchKeys, compareFields, checkId, allowFuzzy, skipKeys)
//   left, right       : arrays of canonical records
//   matchKeys         : ordered array, e.g. ['mbi','member_id','policy_number','name_dob']
//   compareFields     : canonical field names to diff once a match is established
//   checkId           : reconciliation type id (stored on each exception)
//   allowFuzzy        : if true and no exact key matches, try fuzzy
//   skipKeys          : (optional) array of match keys to skip — e.g. ['policy_number']
//                       for AB↔Humana, where the two sides intentionally differ
//
// Returns an array of exception objects.

function matchAndCompare(left, right, matchKeys, compareFields, checkId, allowFuzzy, skipKeys) {
  if (skipKeys && skipKeys.length) {
    var skip = {};
    for (var s = 0; s < skipKeys.length; s++) skip[skipKeys[s]] = true;
    matchKeys = matchKeys.filter(function (k) { return !skip[k]; });
  }
  var indexes = {};
  for (var i = 0; i < matchKeys.length; i++) {
    var key = matchKeys[i];
    indexes[key] = buildIndex_(right, key);
  }

  var matchedRightRows = {};
  var exceptions = [];

  for (var l = 0; l < left.length; l++) {
    var L = left[l];
    var hit = null;
    var usedKey = null;

    for (var k = 0; k < matchKeys.length; k++) {
      var mk = matchKeys[k];
      var kv = keyValue_(L, mk);
      if (!kv) continue;
      var bucket = indexes[mk][kv];
      if (bucket && bucket.length) {
        // First non-claimed match wins.
        for (var b = 0; b < bucket.length; b++) {
          if (!matchedRightRows[bucket[b].__src_row]) {
            hit = bucket[b];
            usedKey = mk;
            break;
          }
        }
        if (hit) break;
      }
    }

    var fuzzyScore = null;
    if (!hit && allowFuzzy) {
      var fz = fuzzyFind(L, right, matchedRightRows);
      if (fz) {
        hit = fz.record;
        usedKey = 'fuzzy';
        fuzzyScore = fz.score;
      }
    }

    if (!hit) {
      exceptions.push({
        check: checkId,
        type: EXCEPTION_TYPES.ONLY_IN_AB,
        left: L,
        right: null,
        matched_by: null,
        diffs: []
      });
      continue;
    }

    matchedRightRows[hit.__src_row] = true;
    var diffs = diffFields_(L, hit, compareFields);
    if (usedKey === 'fuzzy') {
      exceptions.push({
        check: checkId,
        type: EXCEPTION_TYPES.FUZZY_REVIEW,
        left: L,
        right: hit,
        matched_by: 'fuzzy',
        fuzzy_score: fuzzyScore,
        diffs: diffs
      });
    } else if (diffs.length > 0) {
      exceptions.push({
        check: checkId,
        type: EXCEPTION_TYPES.FIELD_MISMATCH,
        left: L,
        right: hit,
        matched_by: usedKey,
        diffs: diffs
      });
    }
  }

  for (var r = 0; r < right.length; r++) {
    if (!matchedRightRows[right[r].__src_row]) {
      exceptions.push({
        check: checkId,
        type: EXCEPTION_TYPES.ONLY_IN_CARRIER,
        left: null,
        right: right[r],
        matched_by: null,
        diffs: []
      });
    }
  }

  return exceptions;
}

function buildIndex_(rows, key) {
  var idx = {};
  for (var i = 0; i < rows.length; i++) {
    var v = keyValue_(rows[i], key);
    if (!v) continue;
    if (!idx[v]) idx[v] = [];
    idx[v].push(rows[i]);
  }
  return idx;
}

function keyValue_(rec, key) {
  if (key === 'name_dob') {
    var fn = norm_(rec.first_name);
    var ln = norm_(rec.last_name);
    var dob = rec.dob || '';
    if (!ln || !dob) return null;
    // Middle name is intentionally NOT in the exact key — it's an optional
    // field that varies between AB and carrier feeds. It contributes only to
    // fuzzy similarity (see 41_Fuzzy.gs).
    return ln + '|' + fn + '|' + dob;
  }
  var v = rec[key];
  if (v === null || v === undefined || v === '') return null;
  return String(v).trim().toUpperCase();
}

function norm_(s) {
  if (!s) return '';
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function diffFields_(L, R, fields) {
  var out = [];
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var lv = L[f];
    var rv = R[f];
    if (valuesEqual_(lv, rv)) continue;
    out.push({ field: f, left: lv, right: rv });
  }
  return out;
}

function valuesEqual_(a, b) {
  if (a === b) return true;
  if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  // string-insensitive comparison for plain strings
  var sa = String(a).trim().toUpperCase();
  var sb = String(b).trim().toUpperCase();
  return sa === sb;
}
