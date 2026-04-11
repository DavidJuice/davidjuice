import type { ReconciliationResult } from '../../types/reconciliation';

interface SummaryDashboardProps {
  result: ReconciliationResult;
}

export function SummaryDashboard({ result }: SummaryDashboardProps) {
  const matchRate = result.totalBobRecords > 0
    ? Math.round((result.matchedCount / result.totalBobRecords) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Top stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="BOB Records"
          value={result.totalBobRecords}
          color="text-navy"
        />
        <StatCard
          label="AB Records"
          value={result.totalAbRecords}
          color="text-navy"
        />
        <StatCard
          label="Matched"
          value={result.matchedCount}
          subtitle={`${matchRate}% match rate`}
          color="text-success"
        />
        <StatCard
          label="Total Discrepancies"
          value={result.discrepancies.length}
          color={result.discrepancies.length > 0 ? 'text-error' : 'text-success'}
        />
      </div>

      {/* Severity breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <SeverityCard
          label="High"
          count={result.summaryBySeverity.high}
          description="Missing records, policy mismatches"
          bgColor="bg-error-light"
          textColor="text-error"
          borderColor="border-error/20"
        />
        <SeverityCard
          label="Medium"
          count={result.summaryBySeverity.medium}
          description="Date or premium differences"
          bgColor="bg-warning-light"
          textColor="text-warning"
          borderColor="border-warning/20"
        />
        <SeverityCard
          label="Low"
          count={result.summaryBySeverity.low}
          description="Contact info differences"
          bgColor="bg-info-light"
          textColor="text-info"
          borderColor="border-info/20"
        />
      </div>

      {/* Type breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <TypeCard
          label="Field Mismatches"
          count={result.summaryByType.field_mismatch}
          icon="⚡"
        />
        <TypeCard
          label="In BOB, Not in AB"
          count={result.summaryByType.in_bob_not_in_ab}
          icon="📥"
        />
        <TypeCard
          label="In AB, Not in BOB"
          count={result.summaryByType.in_ab_not_in_bob}
          icon="📤"
        />
      </div>

      {/* Matching details */}
      <div className="rounded-xl border border-gray-border bg-white p-4 shadow-sm">
        <h4 className="text-xs font-semibold text-gray uppercase tracking-wide">Matching Details</h4>
        <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray">Middle Name</p>
            <p className="font-medium text-navy">{result.middleNameIncluded ? 'Included' : 'Excluded'}</p>
          </div>
          <div>
            <p className="text-xs text-gray">Level 1 (Name+DOB)</p>
            <p className="font-medium text-navy">{result.escalationStats.level1Matches}</p>
          </div>
          <div>
            <p className="text-xs text-gray">Level 2 (+Phone)</p>
            <p className="font-medium text-navy">{result.escalationStats.level2Escalations}</p>
          </div>
          <div>
            <p className="text-xs text-gray">Level 3 (+Zip)</p>
            <p className="font-medium text-navy">{result.escalationStats.level3Escalations}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, color }: {
  label: string;
  value: number;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-border bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
      {subtitle && <p className="text-xs text-gray">{subtitle}</p>}
    </div>
  );
}

function SeverityCard({ label, count, description, bgColor, textColor, borderColor }: {
  label: string;
  count: number;
  description: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}) {
  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-semibold ${textColor}`}>{label}</p>
        <span className={`text-xl font-bold ${textColor}`}>{count}</span>
      </div>
      <p className="mt-1 text-xs text-gray">{description}</p>
    </div>
  );
}

function TypeCard({ label, count, icon }: { label: string; count: number; icon: string }) {
  return (
    <div className="rounded-xl border border-gray-border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <p className="text-sm font-medium text-navy">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-bold text-navy">{count.toLocaleString()}</p>
    </div>
  );
}
