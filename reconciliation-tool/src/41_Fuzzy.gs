// Blocked fuzzy matching: blocks by lower(last_name)[0] + dob.year, then runs
// Levenshtein-based similarity inside the block. Designed to keep total work
// tractable at 20k x 20k.
//
// Returns { record, score } where score is in [0,1] and >= settings.fuzzy_threshold,
// or null if no candidate above the threshold (or block exceeded the safety cap).

function fuzzyFind(L, rightRows, claimed) {
  var settings = getSettings();
  var threshold = settings.fuzzy_threshold || 0.85;
  var maxBlock  = settings.fuzzy_max_block_size || 500;

  var blocks = getOrBuildFuzzyBlocks_(rightRows);
  var blockKey = fuzzyBlockKey_(L);
  if (!blockKey) return null;
  var bucket = blocks[blockKey];
  if (!bucket || bucket.length === 0) return null;
  if (bucket.length > maxBlock) {
    // Block too large to fuzzy-search efficiently — skip rather than time out.
    return null;
  }

  var best = null;
  var bestScore = 0;
  for (var i = 0; i < bucket.length; i++) {
    var R = bucket[i];
    if (claimed && claimed[R.__src_row]) continue;
    var score = recordSimilarity_(L, R);
    if (score > bestScore) {
      best = R;
      bestScore = score;
    }
  }
  if (best && bestScore >= threshold) {
    return { record: best, score: Number(bestScore.toFixed(3)) };
  }
  return null;
}

// Cache blocks per right-side reference so we don't rebuild per left record.
var __FUZZY_BLOCK_CACHE = { ref: null, blocks: null };

function getOrBuildFuzzyBlocks_(rightRows) {
  if (__FUZZY_BLOCK_CACHE.ref === rightRows) return __FUZZY_BLOCK_CACHE.blocks;
  var blocks = {};
  for (var i = 0; i < rightRows.length; i++) {
    var k = fuzzyBlockKey_(rightRows[i]);
    if (!k) continue;
    if (!blocks[k]) blocks[k] = [];
    blocks[k].push(rightRows[i]);
  }
  __FUZZY_BLOCK_CACHE = { ref: rightRows, blocks: blocks };
  return blocks;
}

function fuzzyBlockKey_(rec) {
  var ln = (rec.last_name || '').toString().trim().toLowerCase();
  if (!ln) return null;
  var initial = ln.charAt(0);
  var year = '';
  if (rec.dob) {
    var m = String(rec.dob).match(/^(\d{4})/);
    if (m) year = m[1];
  }
  return initial + ':' + year;
}

function recordSimilarity_(a, b) {
  // Weighted sim: last (35%) + first (25%) + dob exact (25%) + zip/MBI/policy bonuses (15%)
  var ln = stringSim_(a.last_name, b.last_name);
  var fn = stringSim_(a.first_name, b.first_name);
  var dob = (a.dob && b.dob && a.dob === b.dob) ? 1 : 0;
  var bonus = 0;
  if (a.mbi && b.mbi && a.mbi === b.mbi) bonus = Math.max(bonus, 1);
  if (a.policy_number && b.policy_number && String(a.policy_number).toUpperCase() === String(b.policy_number).toUpperCase()) bonus = Math.max(bonus, 0.7);
  return ln * 0.35 + fn * 0.25 + dob * 0.25 + bonus * 0.15;
}

function stringSim_(a, b) {
  if (!a || !b) return 0;
  var sa = String(a).toLowerCase().replace(/[^a-z0-9]/g, '');
  var sb = String(b).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!sa || !sb) return 0;
  if (sa === sb) return 1;
  var dist = levenshtein_(sa, sb);
  var maxLen = Math.max(sa.length, sb.length);
  return 1 - (dist / maxLen);
}

function levenshtein_(a, b) {
  var alen = a.length, blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  var prev = new Array(blen + 1);
  var curr = new Array(blen + 1);
  for (var j = 0; j <= blen; j++) prev[j] = j;
  for (var i = 1; i <= alen; i++) {
    curr[0] = i;
    for (var k = 1; k <= blen; k++) {
      var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
      curr[k] = Math.min(
        curr[k - 1] + 1,
        prev[k] + 1,
        prev[k - 1] + cost
      );
    }
    var swap = prev; prev = curr; curr = swap;
  }
  return prev[blen];
}
