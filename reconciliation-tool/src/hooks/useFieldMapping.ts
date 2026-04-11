import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { autoMapFields, saveAllLearnings } from '../lib/fieldAutoMapper';
import type { SourceType, FieldMapping, UnifiedRecord } from '../types';
import { IGNORE_FIELD } from '../constants/fieldMappings';

export function useFieldMapping() {
  const parsedSources = useAppStore(s => s.parsedSources);
  const setSourceMappings = useAppStore(s => s.setSourceMappings);
  const setBobRecords = useAppStore(s => s.setBobRecords);
  const setAbRecords = useAppStore(s => s.setAbRecords);
  const sourceMappings = useAppStore(s => s.sourceMappings);

  /**
   * Auto-detect field mappings for a parsed source.
   */
  const detectMappings = useCallback((sourceType: SourceType) => {
    const source = parsedSources.get(sourceType);
    if (!source) return;

    const mappings = autoMapFields(source.headers);
    setSourceMappings(sourceType, {
      sourceType,
      mappings,
    });
  }, [parsedSources, setSourceMappings]);

  /**
   * Auto-detect mappings for all parsed sources.
   */
  const detectAllMappings = useCallback(() => {
    for (const sourceType of parsedSources.keys()) {
      detectMappings(sourceType);
    }
  }, [parsedSources, detectMappings]);

  /**
   * Update a single field mapping.
   */
  const updateMapping = useCallback((
    sourceType: SourceType,
    sourceColumn: string,
    canonicalField: string
  ) => {
    const existing = sourceMappings.get(sourceType);
    if (!existing) return;

    const updated = existing.mappings.map(m =>
      m.sourceColumn === sourceColumn
        ? { ...m, canonicalField, isManual: true, confidence: 1.0 }
        : m
    );

    setSourceMappings(sourceType, { sourceType, mappings: updated });
  }, [sourceMappings, setSourceMappings]);

  /**
   * Apply mappings to transform parsed rows into unified records.
   */
  const applyMappings = useCallback(() => {
    const bobSources: SourceType[] = ['humana_bob', 'uhc_bob'];
    const abSources: SourceType[] = ['ab_policy', 'ab_individual'];

    const bobRecords: UnifiedRecord[] = [];
    const abRecords: UnifiedRecord[] = [];

    for (const [sourceType, source] of parsedSources) {
      const mapping = sourceMappings.get(sourceType);
      if (!mapping) continue;

      // Save learned mappings
      saveAllLearnings(mapping.mappings);

      const records = transformRows(source.rows, mapping.mappings, sourceType);

      if (bobSources.includes(sourceType)) {
        bobRecords.push(...records);
      } else if (abSources.includes(sourceType)) {
        abRecords.push(...records);
      }
    }

    setBobRecords(bobRecords);
    setAbRecords(abRecords);
  }, [parsedSources, sourceMappings, setBobRecords, setAbRecords]);

  /**
   * Check if all sources have a middle name column mapped.
   */
  const allSourcesHaveMiddleName = useCallback((): boolean => {
    for (const [, mapping] of sourceMappings) {
      const hasMiddle = mapping.mappings.some(
        m => m.canonicalField === 'middleName' && m.sourceColumn !== ''
      );
      if (!hasMiddle) return false;
    }
    return sourceMappings.size > 0;
  }, [sourceMappings]);

  return {
    detectMappings,
    detectAllMappings,
    updateMapping,
    applyMappings,
    allSourcesHaveMiddleName,
  };
}

function transformRows(
  rows: Record<string, string>[],
  mappings: FieldMapping[],
  sourceType: SourceType
): UnifiedRecord[] {
  // Build a lookup: canonicalField -> sourceColumn
  const fieldMap = new Map<string, string>();
  for (const m of mappings) {
    if (m.canonicalField !== IGNORE_FIELD) {
      fieldMap.set(m.canonicalField, m.sourceColumn);
    }
  }

  return rows.map(row => {
    const record: UnifiedRecord = {
      firstName: '',
      middleName: '',
      lastName: '',
      dob: '',
      ssn: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      policyNumber: '',
      carrier: '',
      plan: '',
      effectiveDate: '',
      terminationDate: '',
      status: '',
      premium: '',
      _source: sourceType,
      _rawRow: row,
    };

    for (const [canonical, sourceCol] of fieldMap) {
      if (canonical in record && canonical !== '_source' && canonical !== '_rawRow') {
        (record as Record<string, unknown>)[canonical] = row[sourceCol] || '';
      }
    }

    return record;
  });
}
