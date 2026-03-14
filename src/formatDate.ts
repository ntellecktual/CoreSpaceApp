/**
 * Formats any date-like string to MM-DD-YYYY for display.
 * Handles ISO (YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss), MM-DD-YYYY, and Date-parseable strings.
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';

  // Already MM-DD-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;

  // ISO: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[2]}-${isoMatch[3]}-${isoMatch[1]}`;

  // Fallback: try Date parse
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}-${dd}-${d.getFullYear()}`;
  }

  return dateStr;
}

/** Returns today as MM-DD-YYYY. */
export function todayFormatted(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${d.getFullYear()}`;
}

/** Converts MM-DD-YYYY → YYYY-MM-DD for lexicographic comparison. */
export function toSortableDate(dateStr: string): string {
  const m = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[1]}-${m[2]}`;

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);

  return dateStr;
}
