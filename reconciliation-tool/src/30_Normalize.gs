// Normalizes a raw row matrix from a scratch tab into canonical records, using
// the field mapping for the given source key.

function normalize(sourceKey, rawRows) {
  if (!rawRows || rawRows.length < 1) return [];
  var mappings = getFieldMappings();
  var src = mappings.sources[sourceKey];
  if (!src) throw new Error('No field mapping for source: ' + sourceKey);

  var headerRow = rawRows[0];
  var headerIndex = resolveHeaderIndex_(headerRow, src.fields);

  // Validate required headers
  if (src.header_required) {
    for (var i = 0; i < src.header_required.length; i++) {
      var req = src.header_required[i];
      if (!headerHasColumn_(headerRow, req)) {
        throw new Error('Required header not found in ' + sourceKey + ': ' + req);
      }
    }
  }

  var out = [];
  for (var r = 1; r < rawRows.length; r++) {
    var row = rawRows[r];
    if (isBlankRow_(row)) continue;
    var rec = { __src_row: r + 1, __source: sourceKey };
    var fields = src.fields;
    for (var canon in fields) {
      var spec = fields[canon];
      if (spec && spec.constant !== undefined) {
        rec[canon] = spec.constant;
        continue;
      }
      var idx = headerIndex[canon];
      if (idx === undefined || idx < 0) {
        rec[canon] = null;
        continue;
      }
      rec[canon] = coerce_(row[idx], spec);
    }
    out.push(rec);
  }
  return out;
}

function resolveHeaderIndex_(headerRow, fieldsSpec) {
  var byNorm = {};
  for (var i = 0; i < headerRow.length; i++) {
    byNorm[normalizeHeaderName(headerRow[i])] = i;
  }
  var out = {};
  for (var canon in fieldsSpec) {
    var spec = fieldsSpec[canon];
    if (spec && spec.constant !== undefined) continue;
    var aliases = (spec && (spec.columns || spec)) || [];
    if (!Array.isArray(aliases)) aliases = aliases.columns || [];
    out[canon] = -1;
    for (var a = 0; a < aliases.length; a++) {
      var key = normalizeHeaderName(aliases[a]);
      if (byNorm[key] !== undefined) {
        out[canon] = byNorm[key];
        break;
      }
    }
  }
  return out;
}

function headerHasColumn_(headerRow, columnName) {
  var target = normalizeHeaderName(columnName);
  for (var i = 0; i < headerRow.length; i++) {
    if (normalizeHeaderName(headerRow[i]) === target) return true;
  }
  return false;
}

function isBlankRow_(row) {
  for (var i = 0; i < row.length; i++) {
    if (row[i] !== '' && row[i] !== null && row[i] !== undefined) return false;
  }
  return true;
}

function coerce_(raw, spec) {
  if (raw === '' || raw === null || raw === undefined) return null;
  var s = (typeof raw === 'string') ? raw : String(raw);
  var t = (spec && spec.type) || 'string';

  if (t === 'date') {
    return parseDateToIso_(raw);
  }
  if (t === 'number') {
    var n = Number(String(raw).replace(/[$,\s]/g, ''));
    return isNaN(n) ? null : n;
  }
  s = s.trim();
  if (spec && spec.transform) {
    if (spec.transform === 'uppercase') s = s.toUpperCase();
    else if (spec.transform === 'lowercase') s = s.toLowerCase();
    else if (spec.transform === 'trim')      { /* already trimmed */ }
  }
  return s;
}

// Returns ISO yyyy-MM-dd, or null if unparseable. Handles Date objects, common
// US formats (MM/dd/yyyy, MM-dd-yyyy), and ISO strings.
function parseDateToIso_(raw) {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return formatIso_(raw);
  }
  var s = String(raw).trim();
  if (!s) return null;

  // ISO yyyy-MM-dd or yyyy/MM/dd
  var m = s.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
  if (m) return pad4_(m[1]) + '-' + pad2_(m[2]) + '-' + pad2_(m[3]);

  // MM/dd/yyyy or M-d-yyyy
  m = s.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{2,4})/);
  if (m) {
    var yyyy = m[3].length === 2 ? ('20' + m[3]) : m[3];
    return pad4_(yyyy) + '-' + pad2_(m[1]) + '-' + pad2_(m[2]);
  }

  var d = new Date(s);
  if (!isNaN(d.getTime())) return formatIso_(d);
  return null;
}

function formatIso_(d) {
  return pad4_(d.getFullYear()) + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate());
}
function pad2_(n) { n = String(n); return n.length < 2 ? ('0' + n) : n; }
function pad4_(n) { n = String(n); while (n.length < 4) n = '0' + n; return n; }
