import { create } from 'zustand';
import type { SourceType, ParsedSource, SourceMappings } from '../types';
import type { CommissionRecord, CommissionResult, CommissionWizardStep } from '../types/commission';

interface FileEntry {
  id: string;
  name: string;
  size: number;
  sourceType: SourceType;
  file: File;
}

interface CommissionState {
  currentStep: CommissionWizardStep;
  setStep: (step: CommissionWizardStep) => void;

  files: FileEntry[];
  addFile: (entry: FileEntry) => void;
  removeFile: (id: string) => void;
  clearFiles: (sourceType: SourceType) => void;

  parsedSources: Map<SourceType, ParsedSource>;
  setParsedSource: (sourceType: SourceType, data: ParsedSource) => void;

  sourceMappings: Map<SourceType, SourceMappings>;
  setSourceMappings: (sourceType: SourceType, mappings: SourceMappings) => void;

  commRecords: CommissionRecord[];
  abRecords: CommissionRecord[];
  setCommRecords: (records: CommissionRecord[]) => void;
  setAbRecords: (records: CommissionRecord[]) => void;

  result: CommissionResult | null;
  setResult: (result: CommissionResult | null) => void;
  isMatching: boolean;
  setIsMatching: (v: boolean) => void;

  reset: () => void;
}

export const useCommissionStore = create<CommissionState>()((set) => ({
  currentStep: 1,
  setStep: (step) => set({ currentStep: step }),

  files: [],
  addFile: (entry) => set(state => ({ files: [...state.files, entry] })),
  removeFile: (id) => set(state => ({
    files: state.files.filter(f => f.id !== id),
  })),
  clearFiles: (sourceType) => set(state => ({
    files: state.files.filter(f => f.sourceType !== sourceType),
  })),

  parsedSources: new Map(),
  setParsedSource: (sourceType, data) => set(state => {
    const next = new Map(state.parsedSources);
    next.set(sourceType, data);
    return { parsedSources: next };
  }),

  sourceMappings: new Map(),
  setSourceMappings: (sourceType, mappings) => set(state => {
    const next = new Map(state.sourceMappings);
    next.set(sourceType, mappings);
    return { sourceMappings: next };
  }),

  commRecords: [],
  abRecords: [],
  setCommRecords: (records) => set({ commRecords: records }),
  setAbRecords: (records) => set({ abRecords: records }),

  result: null,
  setResult: (result) => set({ result }),
  isMatching: false,
  setIsMatching: (v) => set({ isMatching: v }),

  reset: () => set({
    currentStep: 1,
    files: [],
    parsedSources: new Map(),
    sourceMappings: new Map(),
    commRecords: [],
    abRecords: [],
    result: null,
    isMatching: false,
  }),
}));
