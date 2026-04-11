import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ParseWorkerMessage {
  type: 'parse';
  id: string;
  fileName: string;
  data: ArrayBuffer;
  fileType: string;
}

export interface ParseWorkerResult {
  type: 'result' | 'error';
  id: string;
  headers?: string[];
  rows?: Record<string, string>[];
  rowCount?: number;
  error?: string;
}

self.onmessage = (e: MessageEvent<ParseWorkerMessage>) => {
  const { id, fileName, data, fileType } = e.data;

  try {
    let headers: string[];
    let rows: Record<string, string>[];

    if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      const text = new TextDecoder('utf-8').decode(data);
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
      });
      headers = result.meta.fields || [];
      rows = (result.data as Record<string, string>[]).map(row => {
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          cleaned[k] = typeof v === 'string' ? v.trim() : String(v ?? '');
        }
        return cleaned;
      });
    } else {
      // XLSX / XLS
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false,
      });

      if (rawRows.length === 0) {
        headers = [];
        rows = [];
      } else {
        headers = Object.keys(rawRows[0]);
        rows = rawRows.map(row => {
          const cleaned: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            cleaned[k] = typeof v === 'string' ? v.trim() : String(v ?? '');
          }
          return cleaned;
        });
      }
    }

    const response: ParseWorkerResult = {
      type: 'result',
      id,
      headers,
      rows,
      rowCount: rows.length,
    };
    self.postMessage(response);
  } catch (err) {
    const response: ParseWorkerResult = {
      type: 'error',
      id,
      error: err instanceof Error ? err.message : 'Unknown parsing error',
    };
    self.postMessage(response);
  }
};
