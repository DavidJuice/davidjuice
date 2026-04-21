import type {
  CommissionRecord,
  CommissionResult,
  CommissionMatch,
  CommissionWorkerMessage,
  CommissionWorkerResult,
} from '../types/commission';

function normalizeMBI(mbi: string): string {
  return mbi.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function parseAmount(amt: string): number {
  const cleaned = amt.replace(/[^0-9.\-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

self.onmessage = (e: MessageEvent<CommissionWorkerMessage>) => {
  const { commRecords, abRecords } = e.data;

  try {
    const result = matchCommissions(commRecords, abRecords);
    const msg: CommissionWorkerResult = { type: 'complete', result };
    self.postMessage(msg);
  } catch (err) {
    const msg: CommissionWorkerResult = {
      type: 'error',
      error: err instanceof Error ? err.message : 'Commission matching failed',
    };
    self.postMessage(msg);
  }
};

function matchCommissions(
  commRecords: CommissionRecord[],
  abRecords: CommissionRecord[],
): CommissionResult {
  const abIndex = new Map<string, CommissionRecord>();
  for (const ab of abRecords) {
    const mbi = normalizeMBI(ab.mbi);
    if (mbi) {
      abIndex.set(mbi, ab);
    }
  }

  const matched: CommissionMatch[] = [];
  const unmatchedComm: CommissionRecord[] = [];
  const matchedAbMBIs = new Set<string>();

  let totalCommissionAmount = 0;
  let matchedCommissionAmount = 0;
  let unmatchedCommissionAmount = 0;

  for (const comm of commRecords) {
    const mbi = normalizeMBI(comm.mbi);
    const amt = parseAmount(comm.commAmt);
    totalCommissionAmount += amt;

    const abRecord = mbi ? abIndex.get(mbi) : undefined;
    if (abRecord) {
      matched.push({ mbi, commRecord: comm, abRecord });
      matchedAbMBIs.add(mbi);
      matchedCommissionAmount += amt;
    } else {
      unmatchedComm.push(comm);
      unmatchedCommissionAmount += amt;
    }
  }

  const unmatchedAb: CommissionRecord[] = [];
  for (const [mbi, ab] of abIndex) {
    if (!matchedAbMBIs.has(mbi)) {
      unmatchedAb.push(ab);
    }
  }

  return {
    timestamp: Date.now(),
    totalCommRecords: commRecords.length,
    totalAbRecords: abRecords.length,
    matchedCount: matched.length,
    matched,
    unmatchedComm,
    unmatchedAb,
    totalCommissionAmount: Math.round(totalCommissionAmount * 100) / 100,
    matchedCommissionAmount: Math.round(matchedCommissionAmount * 100) / 100,
    unmatchedCommissionAmount: Math.round(unmatchedCommissionAmount * 100) / 100,
  };
}
