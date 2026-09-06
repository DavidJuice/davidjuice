/** Escapes a single CSV cell (RFC 4180). */
function cell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function toCSV(columns, rows) {
  const header = columns.map((c) => cell(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => cell(c.value(row))).join(',')).join('\r\n')
  return `${header}\r\n${body}`
}

/** Triggers a browser download of a generated CSV (BOM for Excel). */
export function downloadCSV(filename, columns, rows) {
  // Leading BOM so Excel opens UTF-8 CSVs with the right encoding.
  const blob = new Blob([`\uFEFF${toCSV(columns, rows)}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
