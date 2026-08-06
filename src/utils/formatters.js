/**
 * Returns '-' for null/undefined or negative mobile numbers (soft-deleted users).
 */
export function formatMobile(value) {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  if (!Number.isNaN(n) && n < 0) return '-';
  const s = String(value).trim();
  return s || '-';
}
