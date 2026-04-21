import type { CommissionResult } from '../../types/commission';

interface CommissionSummaryDashboardProps {
  result: CommissionResult;
}

export function CommissionSummaryDashboard({ result }: CommissionSummaryDashboardProps) {
  const matchRate = result.totalCommRecords > 0
    ? Math.round((result.matchedCount / result.totalCommRecords) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Record counts */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Commission Entries" value={result.totalCommRecords} color="navy" />
        <StatCard label="AB Records" value={result.totalAbRecords} color="navy" />
        <StatCard label="Matched" value={result.matchedCount} color="success" />
        <StatCard label="Match Rate" value={`${matchRate}%`} color={matchRate >= 90 ? 'success' : matchRate >= 70 ? 'warning' : 'error'} />
      </div>

      {/* Dollar amounts */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          label="Total Commission $"
          value={formatCurrency(result.totalCommissionAmount)}
          color="navy"
        />
        <StatCard
          label="Matched Commission $"
          value={formatCurrency(result.matchedCommissionAmount)}
          color="success"
        />
        <StatCard
          label="Unmatched Commission $"
          value={formatCurrency(result.unmatchedCommissionAmount)}
          color={result.unmatchedCommissionAmount > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Discrepancy counts */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <StatCard
          label="In Commission, Not in AB"
          value={result.unmatchedComm.length}
          subtitle="Unknown payments — investigate"
          color={result.unmatchedComm.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="In AB, Not in Commission"
          value={result.unmatchedAb.length}
          subtitle="Carrier may not be paying — follow up"
          color={result.unmatchedAb.length > 0 ? 'error' : 'success'}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, color }: {
  label: string;
  value: string | number;
  subtitle?: string;
  color: 'navy' | 'success' | 'warning' | 'error';
}) {
  const colorClasses = {
    navy: 'border-navy/20 bg-navy/5',
    success: 'border-success/20 bg-success-light',
    warning: 'border-warning/20 bg-warning-light',
    error: 'border-error/20 bg-error-light',
  };
  const valueColors = {
    navy: 'text-navy',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-medium text-gray">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueColors[color]}`}>{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray">{subtitle}</p>}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
