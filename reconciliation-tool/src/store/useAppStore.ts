import { create } from 'zustand';
import type { SourceType, ParsedSource, SourceMappings, UnifiedRecord } from '../types';
import type { ReconciliationResult, MatchConfig } from '../types/reconciliation';

export type WizardStep = 1 | 2 | 3 | 4;

interface FileEntry {
  id: string;
  name: string;
  size: number;
  sourceType: SourceType;
  file: File;
}

interface OCRProgress {
  total: number;
  processed: number;
  currentFile: string;
  isRunning: boolean;
}

interface AppState {
  // Wizard navigation
  currentStep: WizardStep;
  setStep: (step: WizardStep) => void;
  canProceed: () => boolean;

  // File uploads
  files: FileEntry[];
  addFile: (entry: FileEntry) => void;
  addFiles: (entries: FileEntry[]) => void;
  removeFile: (id: string) => void;
  clearFiles: (sourceType: SourceType) => void;

  // Parsed data
  parsedSources: Map<SourceType, ParsedSource>;
  setParsedSource: (sourceType: SourceType, data: ParsedSource) => void;

  // OCR progress
  ocrProgress: OCRProgress;
  setOCRProgress: (progress: Partial<OCRProgress>) => void;

  // Field mappings
  sourceMappings: Map<SourceType, SourceMappings>;
  setSourceMappings: (sourceType: SourceType, mappings: SourceMappings) => void;

  // Unified records
  bobRecords: UnifiedRecord[];
  abRecords: UnifiedRecord[];
  setBobRecords: (records: UnifiedRecord[]) => void;
  setAbRecords: (records: UnifiedRecord[]) => void;

  // Reconciliation config
  matchConfig: MatchConfig;
  setMatchConfig: (config: Partial<MatchConfig>) => void;

  // Results
  result: ReconciliationResult | null;
  setResult: (result: ReconciliationResult | null) => void;
  isReconciling: boolean;
  setIsReconciling: (v: boolean) => void;

  // Reset
  reset: () => void;
}

const defaultMatchConfig: MatchConfig = {
  includeMiddleName: true, // will be auto-detected based on sources
  escalateWithPhone: true,
  escalateWithZip: true,
  humanaDateColumn: 'effectiveDate',
  comparisonFields: [
    'firstName', 'middleName', 'lastName', 'dob', 'phone', 'email',
    'address', 'city', 'state', 'zip', 'policyNumber', 'carrier',
    'plan', 'effectiveDate', 'terminationDate', 'status', 'premium',
  ],
};

export const useAppStore = create<AppState>()((set, get) => ({
  // Wizard
  currentStep: 1,
  setStep: (step) => set({ currentStep: step }),
  canProceed: () => {
    const state = get();
    switch (state.currentStep) {
      case 1:
        return state.files.length > 0 && state.parsedSources.size > 0;
      case 2:
        return state.sourceMappings.size > 0;
      case 3:
        return state.bobRecords.length > 0 && state.abRecords.length > 0;
      case 4:
        return state.result !== null;
      default:
        return false;
    }
  },

  // Files
  files: [],
  addFile: (entry) => set(state => ({ files: [...state.files, entry] })),
  addFiles: (entries) => set(state => ({ files: [...state.files, ...entries] })),
  removeFile: (id) => set(state => ({
    files: state.files.filter(f => f.id !== id),
  })),
  clearFiles: (sourceType) => set(state => ({
    files: state.files.filter(f => f.sourceType !== sourceType),
  })),

  // Parsed data
  parsedSources: new Map(),
  setParsedSource: (sourceType, data) => set(state => {
    const next = new Map(state.parsedSources);
    next.set(sourceType, data);
    return { parsedSources: next };
  }),

  // OCR
  ocrProgress: { total: 0, processed: 0, currentFile: '', isRunning: false },
  setOCRProgress: (progress) => set(state => ({
    ocrProgress: { ...state.ocrProgress, ...progress },
  })),

  // Mappings
  sourceMappings: new Map(),
  setSourceMappings: (sourceType, mappings) => set(state => {
    const next = new Map(state.sourceMappings);
    next.set(sourceType, mappings);
    return { sourceMappings: next };
  }),

  // Unified records
  bobRecords: [],
  abRecords: [],
  setBobRecords: (records) => set({ bobRecords: records }),
  setAbRecords: (records) => set({ abRecords: records }),

  // Config
  matchConfig: defaultMatchConfig,
  setMatchConfig: (config) => set(state => ({
    matchConfig: { ...state.matchConfig, ...config },
  })),

  // Results
  result: null,
  setResult: (result) => set({ result }),
  isReconciling: false,
  setIsReconciling: (v) => set({ isReconciling: v }),

  // Reset
  reset: () => set({
    currentStep: 1,
    files: [],
    parsedSources: new Map(),
    ocrProgress: { total: 0, processed: 0, currentFile: '', isRunning: false },
    sourceMappings: new Map(),
    bobRecords: [],
    abRecords: [],
    matchConfig: defaultMatchConfig,
    result: null,
    isReconciling: false,
  }),
}));
