import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import { EmptyState, TBody, TD, TH, THead, TR, Table, TableSkeleton } from '../ui/Table.jsx'
import { IconClock } from '../ui/Icons.jsx'
import { formatDate } from '../../lib/dates.js'

/** Flat, chronological list of the week's individual shift records. */
export default function WorkHoursTable({ logs, employeesById, loading }) {
  if (loading) return <TableSkeleton columns={5} rows={5} />

  if (!logs.length) {
    return (
      <EmptyState
        icon={<IconClock className="h-5 w-5" />}
        title="No hours logged this week"
        description="Click any cell in the grid above to log hours for a day."
      />
    )
  }

  const sorted = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date))

  return (
    <Table>
      <THead>
        <tr>
          <TH>Employee</TH>
          <TH>Date</TH>
          <TH align="right">Hours</TH>
          <TH>Status</TH>
          <TH>Notes</TH>
        </tr>
      </THead>
      <TBody>
        {sorted.map((log) => {
          const emp = employeesById.get(log.employee_id)
          const hours = Number(log.hours_worked ?? 0)
          return (
            <TR key={log.id}>
              <TD>
                <div className="flex items-center gap-2.5">
                  <Avatar name={emp?.full_name} size="sm" />
                  <span className="font-medium text-gray-900">{emp?.full_name ?? 'Unknown'}</span>
                </div>
              </TD>
              <TD>{formatDate(log.log_date, 'EEE, MMM d')}</TD>
              <TD align="right" className="font-medium text-gray-900">
                {hours.toFixed(2).replace(/\.00$/, '')}
              </TD>
              <TD>
                <Badge tone={log.is_overtime ? 'overtime' : 'normal'}>
                  {log.is_overtime ? 'overtime' : 'normal'}
                </Badge>
              </TD>
              <TD className="max-w-[280px] truncate text-gray-500">{log.notes ?? '—'}</TD>
            </TR>
          )
        })}
      </TBody>
    </Table>
  )
}
