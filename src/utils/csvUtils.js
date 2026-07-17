/**
 * Excel-safe CSV cell escaper.
 *
 * Excel silently auto-converts certain values when opening a CSV:
 *   "1/2"          → 1-Feb  (interpreted as a date)
 *   "01/02/2024"   → re-ordered to mm/dd/yyyy based on locale
 *
 * Fix: values that start with a digit and contain "/" are wrapped using Excel's
 * formula-literal syntax  ="value"  which forces plain-text display.
 * This covers fractions like "1/2" as well as date strings like "01/02/2024 14:30".
 */
export function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str === '') return '';

  // Prevent Excel from interpreting slash-separated numeric values as dates.
  if (/^\d/.test(str) && str.includes('/')) {
    return `="${str.replace(/"/g, '""')}"`;
  }

  // Standard CSV quoting for values that contain special characters.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a date/datetime value as "dd/MM/yyyy HH:mm" — always in this fixed
 * format regardless of browser locale.  The "/" causes escapeCell to protect
 * the value from Excel's date auto-detection.
 */
export function formatExportDateTime(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const dd = String(d.getDate()).padStart(2, '0');
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const HH = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${MM}/${yyyy} ${HH}:${mm}`;
  } catch {
    return String(value);
  }
}

/**
 * Builds a CSV string from headers and row arrays, applies escapeCell to every
 * cell, and prepends a UTF-8 BOM so Excel opens the file with correct encoding.
 */
export function buildCsv(headers, rows) {
  const BOM = '﻿';
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ];
  return BOM + lines.join('\n');
}

/**
 * Triggers a browser download of a CSV file.
 */
export function downloadCsv(headers, rows, filename) {
  const csv = buildCsv(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
