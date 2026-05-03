// RFC-4180 stateful CSV parser. Handles quoted fields, escaped quotes (""),
// and newlines embedded inside quoted fields. Used server-side as a fallback;
// the client also uses an inline JS version of this in Client_Csv.html.

function parseCsv(text) {
  var rows = [];
  var row = [];
  var field = '';
  var i = 0;
  var inQuotes = false;
  var len = text.length;

  while (i < len) {
    var c = text.charAt(i);

    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < len && text.charAt(i + 1) === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      // swallow; rely on \n or end-of-input to terminate the row
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }

  // flush final field/row if no trailing newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  var s = String(value);
  if (s.indexOf(',') === -1 && s.indexOf('"') === -1 && s.indexOf('\n') === -1 && s.indexOf('\r') === -1) {
    return s;
  }
  return '"' + s.replace(/"/g, '""') + '"';
}

function buildCsv(rows, header) {
  var lines = [];
  if (header && header.length) {
    lines.push(header.map(csvEscape).join(','));
  }
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (header && header.length) {
      lines.push(header.map(function (h) { return csvEscape(r[h]); }).join(','));
    } else {
      lines.push(r.map(csvEscape).join(','));
    }
  }
  return lines.join('\n');
}

function normalizeHeaderName(s) {
  return String(s || '').trim().toLowerCase().replace(/[\s_\-#]+/g, '');
}
