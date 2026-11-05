// Build a CSV string from a header array and an array of row arrays.
// Numbers are written raw (no currency symbol or thousands separators) so spreadsheets parse them.
const BOM = '﻿' // UTF-8 BOM so Excel detects the encoding and renders Japanese correctly

const escapeField = value => {
  let str = value === null || value === undefined ? '' : String(value)
  // CSV formula injection guard: strings starting with = + - @ are prefixed with a single quote.
  // Numbers are exempt so negative values stay numeric.
  if (typeof value === 'string' && /^[=+\-@]/.test(str)) {
    str = `'${str}`
  }
  // Quote every field and double embedded quotes
  return `"${str.replace(/"/g, '""')}"`
}

export function buildCsv(headers, rows) {
  const lines = [headers, ...rows].map(row => row.map(escapeField).join(','))
  return BOM + lines.join('\r\n') + '\r\n'
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
