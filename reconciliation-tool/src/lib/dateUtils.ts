/**
 * Date parsing and normalization utilities.
 * Handles multiple date formats commonly found in insurance data files.
 */

const DATE_FORMATS = [
  // MM/DD/YYYY
  { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: (m: RegExpMatchArray) => ({ y: +m[3], mo: +m[1], d: +m[2] }) },
  // YYYY-MM-DD (ISO)
  { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, parse: (m: RegExpMatchArray) => ({ y: +m[1], mo: +m[2], d: +m[3] }) },
  // MM-DD-YYYY
  { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, parse: (m: RegExpMatchArray) => ({ y: +m[3], mo: +m[1], d: +m[2] }) },
  // YYYY/MM/DD
  { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, parse: (m: RegExpMatchArray) => ({ y: +m[1], mo: +m[2], d: +m[3] }) },
  // MM.DD.YYYY
  { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, parse: (m: RegExpMatchArray) => ({ y: +m[3], mo: +m[1], d: +m[2] }) },
  // MMDDYYYY (no separator)
  { regex: /^(\d{2})(\d{2})(\d{4})$/, parse: (m: RegExpMatchArray) => ({ y: +m[3], mo: +m[1], d: +m[2] }) },
  // M/D/YYYY (single digit month/day)
  { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, parse: (m: RegExpMatchArray) => ({ y: +m[3] < 50 ? 2000 + +m[3] : 1900 + +m[3], mo: +m[1], d: +m[2] }) },
];

interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Parse a date string into a normalized format.
 * Returns null if the date cannot be parsed.
 */
export function parseDate(dateStr: string): ParsedDate | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  // Try Excel serial date number
  const num = Number(trimmed);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    return excelSerialToDate(num);
  }

  // Try each date format
  for (const fmt of DATE_FORMATS) {
    const match = trimmed.match(fmt.regex);
    if (match) {
      const { y, mo, d } = fmt.parse(match);
      if (isValidDate(y, mo, d)) {
        return { year: y, month: mo, day: d };
      }
    }
  }

  // Try native Date parsing as last resort
  const nativeDate = new Date(trimmed);
  if (!isNaN(nativeDate.getTime())) {
    return {
      year: nativeDate.getFullYear(),
      month: nativeDate.getMonth() + 1,
      day: nativeDate.getDate(),
    };
  }

  return null;
}

/**
 * Convert an Excel serial date number to a ParsedDate.
 */
function excelSerialToDate(serial: number): ParsedDate {
  // Excel epoch: January 1, 1900 (with the Lotus 1-2-3 leap year bug)
  const epoch = new Date(1899, 11, 30);
  const ms = epoch.getTime() + serial * 86400000;
  const date = new Date(ms);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Normalize a date string to YYYY-MM-DD format for consistent comparison.
 */
export function normalizeDate(dateStr: string): string {
  const parsed = parseDate(dateStr);
  if (!parsed) return dateStr.trim();
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
}

/**
 * Compare two date strings for equality after normalization.
 */
export function datesMatch(a: string, b: string): boolean {
  return normalizeDate(a) === normalizeDate(b);
}

/**
 * Compare two date strings for sorting (descending = most recent first).
 * Returns negative if a is more recent, positive if b is more recent.
 */
export function compareDatesDesc(a: string, b: string): number {
  const pa = parseDate(a);
  const pb = parseDate(b);
  if (!pa && !pb) return 0;
  if (!pa) return 1;
  if (!pb) return -1;
  const da = pa.year * 10000 + pa.month * 100 + pa.day;
  const db = pb.year * 10000 + pb.month * 100 + pb.day;
  return db - da;
}
