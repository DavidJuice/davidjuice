import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { SourceType } from '../types';
import type { ParseWorkerMessage, ParseWorkerResult } from '../workers/parseWorker';

export function useFileProcessor() {
  const workerRef = useRef<Worker | null>(null);
  const setParsedSource = useAppStore(s => s.setParsedSource);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/parseWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  const processFile = useCallback(async (
    file: File,
    sourceType: SourceType
  ): Promise<void> => {
    const data = await file.arrayBuffer();
    const worker = getWorker();
    const id = `${sourceType}-${Date.now()}`;

    return new Promise((resolve, reject) => {
      const handler = (e: MessageEvent<ParseWorkerResult>) => {
        if (e.data.id !== id) return;
        worker.removeEventListener('message', handler);

        if (e.data.type === 'error') {
          reject(new Error(e.data.error));
          return;
        }

        setParsedSource(sourceType, {
          sourceType,
          fileName: file.name,
          headers: e.data.headers || [],
          rows: e.data.rows || [],
          rowCount: e.data.rowCount || 0,
        });

        resolve();
      };

      worker.addEventListener('message', handler);

      const msg: ParseWorkerMessage = {
        type: 'parse',
        id,
        fileName: file.name,
        data,
        fileType: file.type,
      };
      worker.postMessage(msg, [data]);
    });
  }, [getWorker, setParsedSource]);

  const cleanup = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  return { processFile, cleanup };
}
