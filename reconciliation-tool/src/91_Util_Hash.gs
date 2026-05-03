// SHA-256 over a string. Used to record file fingerprints in the audit log
// without persisting the raw file contents.

function sha256Hex(input) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input || '', Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var v = (bytes[i] + 256) % 256;
    var h = v.toString(16);
    if (h.length === 1) h = '0' + h;
    hex += h;
  }
  return hex;
}

// Stable hash of a normalized record, used for change detection / dedup.
function recordFingerprint(rec) {
  var keys = Object.keys(rec).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k.charAt(0) === '_') continue;
    parts.push(k + '=' + (rec[k] === null || rec[k] === undefined ? '' : String(rec[k])));
  }
  return sha256Hex(parts.join('|'));
}
