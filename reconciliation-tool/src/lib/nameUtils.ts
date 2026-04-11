/**
 * Name normalization utilities, with special handling for Korean names.
 *
 * Background: ~90% of Ace Insurance clients are Korean. Korean first names
 * typically have two syllables (e.g., "은희" / "Eun Hee"). The US Social
 * Security Administration often splits the romanized form into first name
 * ("Eun") and middle name ("Hee"). Insurance carriers and CRMs may record
 * the name differently depending on their source.
 *
 * The core rule: if ALL data sources contain a middle name column, include
 * the middle name in the identifier. If ANY source lacks middle name data,
 * exclude it globally so matching works consistently across files.
 */

export interface NormalizedName {
  /** Full first name with middle name merged (e.g., "eunhee") */
  fullFirst: string;
  /** First name only, no middle (e.g., "eun") */
  firstOnly: string;
  /** Middle name if present (e.g., "hee") */
  middle: string;
  /** Last name (e.g., "kim") */
  last: string;
  /** Original values for display */
  display: {
    firstName: string;
    middleName: string;
    lastName: string;
  };
}

/**
 * Normalize a name for matching purposes.
 * - Trims whitespace, normalizes Unicode (NFC for Korean jamo)
 * - Lowercases for comparison
 * - If firstName contains a space, splits into first + middle
 */
export function normalizeName(
  firstName: string,
  middleName: string,
  lastName: string
): NormalizedName {
  const rawFirst = (firstName || '').trim();
  const rawMiddle = (middleName || '').trim();
  const rawLast = (lastName || '').trim();

  // Unicode NFC normalization (important for Korean jamo consistency)
  let first = rawFirst.normalize('NFC').toLowerCase();
  let middle = rawMiddle.normalize('NFC').toLowerCase();
  const last = rawLast.normalize('NFC').toLowerCase();

  // If first name contains a space and no middle name is provided,
  // split it (handles "Eun Hee" -> first="eun", middle="hee")
  if (first.includes(' ') && !middle) {
    const parts = first.split(/\s+/);
    first = parts[0];
    middle = parts.slice(1).join('');
  }

  // Remove non-alphanumeric characters except Korean
  const cleanFirst = first.replace(/[^a-z0-9\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g, '');
  const cleanMiddle = middle.replace(/[^a-z0-9\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g, '');
  const cleanLast = last.replace(/[^a-z0-9\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g, '');

  return {
    fullFirst: cleanFirst + cleanMiddle,
    firstOnly: cleanFirst,
    middle: cleanMiddle,
    last: cleanLast,
    display: {
      firstName: rawFirst,
      middleName: rawMiddle,
      lastName: rawLast,
    },
  };
}

/**
 * Build a display name from a unified record's name fields.
 */
export function buildDisplayName(
  firstName: string,
  middleName: string,
  lastName: string
): string {
  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.join(' ');
}

/**
 * Compare two names for equality, respecting the middle name inclusion rule.
 */
export function namesMatch(
  a: NormalizedName,
  b: NormalizedName,
  includeMiddleName: boolean
): boolean {
  if (includeMiddleName) {
    return a.fullFirst === b.fullFirst && a.last === b.last;
  }
  return a.firstOnly === b.firstOnly && a.last === b.last;
}
