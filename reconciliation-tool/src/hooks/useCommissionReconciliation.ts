import { useCallback, useRef } from 'react';
import { useCommissionStore } from '../store/useCommissionStore';
import type { CommissionWorkerMessage, CommissionWorkerResult } from '../types/commission';

export function useCommissionReconciliation() {
  const workerRef = useRef<Worker | null>(null);
  const commRecords = useCommissionStore(s => s.commRecords);
  const abRecords = useCommissionStore(s => s.abRecords);
  const setResult = useCommissionStore(s => s.setResult);
  const setIsMatching = useCommissionStore(s => s.setIsMatching);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/commissionMatchWorker.ts', import.meta.url),
        { type: 'module' },
      );
    }
    return workerRef.current;
  }, []);

  const runMatch = useCallback(async () => {
    setIsMatching(true);
    setResult(null);

    const worker = getWorker();

    return new Promise<void>((resolve, reject) => {
      const handler = (e: MessageEvent<CommissionWorkerResult>) => {
        if (e.data.type === 'complete') {
          worker.removeEventListener('message', handler);
          setResult(e.data.result || null);
          setIsMatching(false);
          resolve();
        } else if (e.data.type === 'error') {
          worker.removeEventListener('message', handler);
          setIsMatching(false);
          reject(new Error(e.data.error));
        }
      };

      worker.addEventListener('message', handler);

      const msg: CommissionWorkerMessage = {
        type: 'start',
        commRecords,
        abRecords,
      };
      worker.postMessage(msg);
    });
  }, [commRecords, abRecords, getWorker, setResult, setIsMatching]);

  const cleanup = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  return { runMatch, cleanup };
}
