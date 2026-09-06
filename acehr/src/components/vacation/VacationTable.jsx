import Avatar from '../ui/Avatar.jsx'
import Badge, { toneFor } from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { EmptyState, ErrorState, TBody, TD, TH, THead, TR, Table, TableSkeleton } from '../ui/Table.jsx'
import { IconCalendar, IconCheck, IconX } from '../ui/Icons.jsx'
import { formatDate, formatRange } from '../../lib/dates.js'

export default function VacationTable({
  requests,
  loading,
  error,
  canReview,
  onApprove,
  onReject,
  onRetry,
  onCreate,
  busyId,
}) {
  if (loading) return <TableSkeleton columns={6} rows={6} />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  if (!requests.length) {
    return (
      <EmptyState
        icon={<IconCalendar className="h-5 w-5" />}
        title="No vacation requests"
        description="Nothing matches these filters yet. Create a request to get started."
        action={
          onCreate && (
            <Button size="sm" onClick={onCreate}>
              New request
            </Button>
          )
        }
      />
    )
  }

  return (
    <Table>
      <THead>
        <tr>
          <TH>Employee</TH>
          <TH>Type</TH>
          <TH>Dates</TH>
          <TH align="right">Days</TH>
          <TH>Status</TH>
          <TH>Submitted</TH>
          {canReview && <TH align="right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {requests.map((req) => (
          <TR key={req.id}>
            <TD>
              <div className="flex items-center gap-2.5">
                <Avatar name={req.employees?.full_name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {req.employees?.full_name ?? 'Unknown'}
                  </p>
                  <p className="truncate text-xs text-gray-500">{req.employees?.branch ?? '—'}</p>
                </div>
              </div>
            </TD>
            <TD className="capitalize">{req.type}</TD>
            <TD>{formatRange(req.start_date, req.end_date)}</TD>
            <TD align="right">{Number(req.days_requested)}</TD>
            <TD>
              <Badge tone={toneFor(req.status)}>{req.status}</Badge>
            </TD>
            <TD className="text-gray-500">{formatDate(req.created_at, 'MMM d, yyyy')}</TD>
            {canReview && (
              <TD align="right">
                {req.status === 'pending' ? (
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="primary"
                      loading={busyId === `${req.id}:approved`}
                      disabled={Boolean(busyId)}
                      onClick={() => onApprove(req)}
                    >
                      <IconCheck className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === `${req.id}:rejected`}
                      disabled={Boolean(busyId)}
                      onClick={() => onReject(req)}
                    >
                      <IconX className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">
                    Reviewed {formatDate(req.reviewed_at, 'MMM d')}
                  </span>
                )}
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  )
}
