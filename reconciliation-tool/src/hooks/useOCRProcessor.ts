import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { OCRWorkerMessage, OCRWorkerResult } from '../workers/ocrWorker';

interface OCRResult {
  id: string;
  name: string;
  text: string;
  confidence: number;
}

export function useOCRProcessor() {
  const workerRef = useRef<Worker | null>(null);
  const setOCRProgress = useAppStore(s => s.setOCRProgress);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/ocrWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  const processImages = useCallback(async (
    files: File[]
  ): Promise<OCRResult[]> => {
    if (files.length === 0) return [];

    const worker = getWorker();
    setOCRProgress({ total: files.length, processed: 0, isRunning: true, currentFile: '' });

    // Process in batches of 5 to avoid memory issues
    const BATCH_SIZE = 5;
    const allResults: OCRResult[] = [];
    let processedTotal = 0;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      const images = await Promise.all(
        batch.map(async (file) => ({
          id: `ocr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          data: await file.arrayBuffer(),
        }))
      );

      const batchResults = await new Promise<OCRResult[]>((resolve, reject) => {
        const handler = (e: MessageEvent<OCRWorkerResult>) => {
          if (e.data.type === 'progress') {
            processedTotal++;
            setOCRProgress({
              processed: processedTotal,
              currentFile: e.data.imageName || '',
            });
          } else if (e.data.type === 'complete') {
            worker.removeEventListener('message', handler);
            resolve(e.data.results || []);
          } else if (e.data.type === 'error') {
            worker.removeEventListener('message', handler);
            reject(new Error(e.data.error));
          }
        };

        worker.addEventListener('message', handler);

        const msg: OCRWorkerMessage = {
          type: 'process',
          images: images.map(img => ({
            id: img.id,
            name: img.name,
            data: img.data,
          })),
        };

        // Transfer ArrayBuffers for zero-copy
        const transferables = images.map(img => img.data);
        worker.postMessage(msg, transferables);
      });

      allResults.push(...batchResults);
    }

    setOCRProgress({ isRunning: false });
    return allResults;
  }, [getWorker, setOCRProgress]);

  const cleanup = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  return { processImages, cleanup };
}
