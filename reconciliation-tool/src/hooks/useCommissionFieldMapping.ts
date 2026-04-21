import { useCallback } from 'react';
import { useCommissionStore } from '../store/useCommissionStore';
import { autoMapFields, saveAllLearnings } from '../lib/fieldAutoMapper';
import { COMMISSION_FIELD_ALIASES, AB_COMMISSION_FIELD_ALIASES } from '../constants/commissionFieldMappings';
import { IGNORE_FIELD } from '../constants/fieldMappings';
import type { SourceType, FieldMapping } from '../types';
import type { CommissionRecord, CommissionSourceType } from '../types/commission';

const COMMISSION_LEARNED_KEY = 'ace-recon-commission-learned-mappings';

export function useCommissionFieldMapping() {
  const parsedSources = useCommissionStore(s => s.parsedSources);
  const setSourceMappings = useCommissionStore(s => s.setSourceMappings);
  const sourceMappings = useCommissionStore(s => s.sourceMappings);
  const setCommRecords = useCommissionStore(s => s.setCommRecords);
  const setAbRecords = useCommissionStore(s => s.setAbRecords);

  const detectMappings = useCallback((sourceType: SourceType) => {
    const source = parsedSources.get(sourceType);
    if (!source) return;

    const aliases = sourceType === 'humana_commission'
      ? COMMISSION_FIELD_ALIASES
      : AB_COMMISSION_FIELD_ALIASES;

    const mappings = autoMapFields(source.headers, aliases, COMMISSION_LEARNED_KEY);
    setSourceMappings(sourceType, { sourceType, mappings });
  }, [parsedSources, setSourceMappings]);

  const detectAllMappings = useCallback(() => {
    for (const sourceType of parsedSources.keys()) {
      detectMappings(sourceType);
    }
  }, [parsedSources, detectMappings]);

  const updateMapping = useCallback((
    sourceType: SourceType,
    sourceColumn: string,
    canonicalField: string,
  ) => {
    const existing = sourceMappings.get(sourceType);
    if (!existing) return;

    const updated = existing.mappings.map(m =>
      m.sourceColumn === sourceColumn
        ? { ...m, canonicalField, isManual: true, confidence: 1.0 }
        : m,
    );

    setSourceMappings(sourceType, { sourceType, mappings: updated });
  }, [sourceMappings, setSourceMappings]);

  const applyMappings = useCallback(() => {
    const commRecords: CommissionRecord[] = [];
    const abRecords: CommissionRecord[] = [];

    for (const [sourceType, source] of parsedSources) {
      const mapping = sourceMappings.get(sourceType);
      if (!mapping) continue;

      saveAllLearnings(mapping.mappings, COMMISSION_LEARNED_KEY);

      const records = transformCommissionRows(
        source.rows,
        mapping.mappings,
        sourceType as CommissionSourceType,
      );

      if (sourceType === 'humana_commission') {
        commRecords.push(...records);
      } else if (sourceType === 'ab_policy') {
        abRecords.push(...records);
      }
    }

    setCommRecords(commRecords);
    setAbRecords(abRecords);
  }, [parsedSources, sourceMappings, setCommRecords, setAbRecords]);

  return {
    detectMappings,
    detectAllMappings,
    updateMapping,
    applyMappings,
  };
}

function transformCommissionRows(
  rows: Record<string, string>[],
  mappings: FieldMapping[],
  sourceType: CommissionSourceType,
): CommissionRecord[] {
  const fieldMap = new Map<string, string>();
  for (const m of mappings) {
    if (m.canonicalField !== IGNORE_FIELD) {
      fieldMap.set(m.canonicalField, m.sourceColumn);
    }
  }

  return rows.map(row => {
    const record: CommissionRecord = {
      mbi: '',
      grpNbr: '',
      mbrNbr: '',
      memberName: '',
      firstName: '',
      lastName: '',
      prodType: '',
      planName: '',
      paidToDate: '',
      monthPaid: '',
      commAmt: '',
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
