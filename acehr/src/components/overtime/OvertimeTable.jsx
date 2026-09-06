import Avatar from '../ui/Avatar.jsx'
import Badge, { toneFor } from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import OTFlag from './OTFlag.jsx'
import { EmptyState, ErrorState, TBody, TD, TH, THead, TR, Table, TableSkeleton } from '../ui/Table.jsx'
import { IconTrend } from '../ui/Icons.jsx'
import { formatCurrency } from '../../lib/stripe.js'
import { formatDate } from '../../lib/dates.js'

function num(value) {
  return Number(value ?? 0)
}

export default function OvertimeTable({
  records,
  loading,
  error,
  canReview,
  onSetStatus,
  onRetry,
  busyId,
}) {
  if (loading) return <TableSkeleton columns={7} rows={6} />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  if (!records.length) {
    return (
      <EmptyState
        icon={<IconTrend className="h-5 w-5" />}
        title="No overtime recorded"
        description="Overtime rolls up automatically once weekly hours pass 40. Log hours to populate this table."
      />
    )
  }

  return (
    <Table className="min-w-full">
      <THead>
        <tr>
          <TH>Employee</TH>
          <TH>Branch</TH>
          <TH>Week of</TH>
          <TH align="right">Regular</TH>
          <TH align="right">Overtime</TH>
          <TH align="right">OT pay (1.5×)</TH>
          <TH>Status</TH>
          {canReview && <TH align="right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {records.map((rec) => (
          <TR key={rec.id}>
            <TD>
              <div className="flex items-center gap-2.5">
                <Avatar name={rec.employees?.full_name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {rec.employees?.full_name ?? 'Unknown'}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {rec.employees?.hourly_rate
                      ? `${formatCurrency(rec.employees.hourly_rate)}/hr`
                      : 'No rate set'}
                  </p>
                </div>
              </div>
            </TD>
            <TD>{rec.employees?.branch ?? '—'}</TD>
            <TD>{formatDate(rec.week_start, 'MMM d, yyyy')}</TD>
            <TD align="right">{num(rec.regular_hours).toFixed(2).replace(/\.00$/, '')}</TD>
            <TD align="right">
              <div className="flex items-center justify-end gap-2">
                <span className="font-medium text-gray-900">
                  {num(rec.overtime_hours).toFixed(2).replace(/\.00$/, '')}
                </span>
                <OTFlag overtimeHours={rec.overtime_hours} />
              </div>
            </TD>
            <TD align="right" className="font-medium text-gray-900">
              {formatCurrency(rec.ot_pay_estimate)}
            </TD>
            <TD>
              <Badge tone={toneFor(rec.status)}>{rec.status}</Badge>
            </TD>
            {canReview && (
              <TD align="right">
                <div className="flex justify-end gap-1.5">
                  {rec.status === 'pending' && (
                    <Button
                      size="sm"
                      loading={busyId === `${rec.id}:approved`}
                      disabled={Boolean(busyId)}
                      onClick={() => onSetStatus(rec.id, 'approved')}
                    >
                      Approve
                    </Button>
                  )}
                  {rec.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === `${rec.id}:paid`}
                      disabled={Boolean(busyId)}
                      onClick={() => onSetStatus(rec.id, 'paid')}
                    >
                      Mark paid
                    </Button>
                  )}
                  {rec.status === 'paid' && <span className="text-xs text-gray-400">Settled</span>}
                </div>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  )
}
