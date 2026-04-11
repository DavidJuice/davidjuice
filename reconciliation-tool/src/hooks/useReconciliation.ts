import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { extractMostRecent } from '../lib/humanaExtractor';
import type { ReconcileWorkerMessage, ReconcileWorkerResult } from '../types/reconciliation';

export function useReconciliation() {
  const workerRef = useRef<Worker | null>(null);
  const bobRecords = useAppStore(s => s.bobRecords);
  const abRecords = useAppStore(s => s.abRecords);
  const matchConfig = useAppStore(s => s.matchConfig);
  const setResult = useAppStore(s => s.setResult);
  const setIsReconciling = useAppStore(s => s.setIsReconciling);
  const setBobRecords = useAppStore(s => s.setBobRecords);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/reconcileWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  /**
   * Pre-process Humana BOB records: extract most recent from log history.
   */
  const preprocessHumana = useCallback(() => {
    const humanaRecords = bobRecords.filter(r => r._source === 'humana_bob');
    const otherBob = bobRecords.filter(r => r._source !== 'humana_bob');

    if (humanaRecords.length === 0) return;

    const extracted = extractMostRecent(
      humanaRecords,
      matchConfig.humanaDateColumn,
      matchConfig.includeMiddleName
    );

    setBobRecords([...otherBob, ...extracted]);
  }, [bobRecords, matchConfig, setBobRecords]);

  /**
   * Run the reconciliation.
   */
  const runReconciliation = useCallback(async () => {
    setIsReconciling(true);
    setResult(null);

    const worker = getWorker();

    return new Promise<void>((resolve, reject) => {
      const handler = (e: MessageEvent<ReconcileWorkerResult>) => {
        if (e.data.type === 'complete') {
          worker.removeEventListener('message', handler);
          setResult(e.data.result || null);
          setIsReconciling(false);
          resolve();
        } else if (e.data.type === 'error') {
          worker.removeEventListener('message', handler);
          setIsReconciling(false);
          reject(new Error(e.data.error));
        }
      };

      worker.addEventListener('message', handler);

      const msg: ReconcileWorkerMessage = {
        type: 'start',
        bobRecords,
        abRecords,
        config: matchConfig,
      };
      worker.postMessage(msg);
    });
  }, [bobRecords, abRecords, matchConfig, getWorker, setResult, setIsReconciling]);

  const cleanup = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  /**
   * Get match preview stats without running full reconciliation.
   */
  const getMatchPreview = useCallback((): {
    bobCount: number;
    abCount: number;
    estimatedMatches: number;
  } => {
    const bobKeys = new Set<string>();
    for (const r of bobRecords) {
      const key = [
        r.firstName?.toLowerCase(),
        matchConfig.includeMiddleName ? r.middleName?.toLowerCase() : '',
        r.lastName?.toLowerCase(),
        r.dob,
      ].filter(Boolean).join('|');
      bobKeys.add(key);
    }

    let matches = 0;
    for (const r of abRecords) {
      const key = [
        r.firstName?.toLowerCase(),
        matchConfig.includeMiddleName ? r.middleName?.toLowerCase() : '',
        r.lastName?.toLowerCase(),
        r.dob,
      ].filter(Boolean).join('|');
      if (bobKeys.has(key)) matches++;
    }

    return {
      bobCount: bobRecords.length,
      abCount: abRecords.length,
      estimatedMatches: matches,
    };
  }, [bobRecords, abRecords, matchConfig]);

  return {
    preprocessHumana,
    runReconciliation,
    getMatchPreview,
    cleanup,
  };
}
