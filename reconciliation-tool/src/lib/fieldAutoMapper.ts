import { FIELD_ALIASES, IGNORE_FIELD } from '../constants/fieldMappings';
import type { FieldMapping } from '../types';

const LEARNED_MAPPINGS_KEY = 'ace-recon-learned-mappings';

/**
 * Auto-map source column headers to canonical fields.
 * Uses a three-tier approach:
 * 1. Check learned mappings from previous sessions (localStorage)
 * 2. Check exact match against known alias dictionary
 * 3. Fuzzy match using Levenshtein distance
 */
export function autoMapFields(headers: string[]): FieldMapping[] {
  const learned = loadLearnedMappings();

  return headers.map(header => {
    const normalized = normalizeHeader(header);

    // Tier 1: Check learned mappings
    if (learned[normalized]) {
      return {
        sourceColumn: header,
        canonicalField: learned[normalized],
        confidence: 1.0,
        isManual: false,
      };
    }

    // Tier 2: Exact alias match
    const exactMatch = findExactMatch(normalized);
    if (exactMatch) {
      return {
        sourceColumn: header,
        canonicalField: exactMatch,
        confidence: 1.0,
        isManual: false,
      };
    }

    // Tier 3: Fuzzy match
    const fuzzyResult = findFuzzyMatch(normalized);
    if (fuzzyResult) {
      return {
        sourceColumn: header,
        canonicalField: fuzzyResult.field,
        confidence: fuzzyResult.score,
        isManual: false,
      };
    }

    // No match
    return {
      sourceColumn: header,
      canonicalField: IGNORE_FIELD,
      confidence: 0,
      isManual: false,
    };
  });
}

/**
 * Save a confirmed mapping to localStorage for future sessions.
 */
export function saveLearning(sourceColumn: string, canonicalField: string): void {
  const learned = loadLearnedMappings();
  learned[normalizeHeader(sourceColumn)] = canonicalField;
  try {
    localStorage.setItem(LEARNED_MAPPINGS_KEY, JSON.stringify(learned));
  } catch {
    // localStorage not available or full - silently ignore
  }
}

/**
 * Save all confirmed mappings at once.
 */
export function saveAllLearnings(mappings: FieldMapping[]): void {
  const learned = loadLearnedMappings();
  for (const m of mappings) {
    if (m.canonicalField !== IGNORE_FIELD) {
      learned[normalizeHeader(m.sourceColumn)] = m.canonicalField;
    }
  }
  try {
    localStorage.setItem(LEARNED_MAPPINGS_KEY, JSON.stringify(learned));
  } catch {
    // silently ignore
  }
}

function loadLearnedMappings(): Record<string, string> {
  try {
    const stored = localStorage.getItem(LEARNED_MAPPINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findExactMatch(normalized: string): string | null {
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(normalized)) {
      return field;
    }
  }
  return null;
}

function findFuzzyMatch(normalized: string): { field: string; score: number } | null {
  let bestField: string | null = null;
  let bestScore = 0;

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const score = similarity(normalized, alias);
      if (score > bestScore && score >= 0.7) {
        bestScore = score;
        bestField = field;
      }
    }
  }

  if (bestField) {
    return { field: bestField, score: bestScore };
  }
  return null;
}

/**
 * Compute similarity between two strings using normalized Levenshtein distance.
 * Returns a value between 0 (no match) and 1 (exact match).
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const maxLen = Math.max(a.length, b.length);
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Use single-row optimization for memory efficiency
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}
