import { useEffect, useRef, useState } from 'react'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import { EmptyState, ErrorState, TBody, TD, TH, THead, TR, Table, TableSkeleton } from '../ui/Table.jsx'
import { IconClock } from '../ui/Icons.jsx'
import { toISODate } from '../../lib/dates.js'
import { DAILY_OT_THRESHOLD, WEEKLY_OT_THRESHOLD } from '../../hooks/useHours.js'
import { format } from 'date-fns'

/** Click-to-edit hours cell. Commits on blur or Enter, cancels on Escape. */
function HoursCell({ value, saving, onCommit, label }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const flagged = value != null && value > DAILY_OT_THRESHOLD

  function start() {
    setDraft(value == null ? '' : String(value))
    setEditing(true)
  }

  async function commit() {
    setEditing(false)
    const next = draft.trim()
    const current = value == null ? '' : String(value)
    if (next === current) return
    try {
      await onCommit(next === '' ? null : Number(next))
    } catch {
      // useHours surfaces the toast; the grid keeps the server value.
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.25"
        min="0"
        max="24"
        value={draft}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') setEditing(false)
        }}
        className="h-9 w-full rounded-md border border-brand bg-white px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={start}
      aria-label={label}
      className={`h-9 w-full rounded-md border border-transparent px-2 text-center text-sm transition-colors hover:border-hairline hover:bg-white ${
        saving ? 'opacity-50' : ''
      } ${flagged ? 'font-semibold text-danger' : value == null ? 'text-gray-300' : 'text-gray-800'}`}
    >
      {value == null ? '—' : value.toFixed(2).replace(/\.00$/, '')}
    </button>
  )
}

export default function WeeklyHoursGrid({
  employees,
  days,
  loading,
  error,
  hoursFor,
  weeklyTotal,
  setHours,
  savingCell,
  onRetry,
  onAddEmployee,
}) {
  if (loading) return <TableSkeleton columns={8} rows={5} />
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  if (!employees.length) {
    return (
      <EmptyState
        icon={<IconClock className="h-5 w-5" />}
        title="No employees to log hours for"
        description="Add active employees and their weekly hours will show up here."
        action={
          onAddEmployee && (
            <button
              type="button"
              onClick={onAddEmployee}
              className="rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-white hover:bg-brand-dark"
            >
              Add employee
            </button>
          )
        }
      />
    )
  }

  return (
    <Table className="min-w-full">
      <THead>
        <tr>
          <TH className="sticky left-0 z-10 bg-[#FAFBFC]">Employee</TH>
          {days.map((day) => (
            <TH key={toISODate(day)} align="center">
              <span className="block">{format(day, 'EEE')}</span>
              <span className="block text-[11px] font-normal normal-case text-gray-400">
                {format(day, 'MMM d')}
              </span>
            </TH>
          ))}
          <TH align="right">Total</TH>
          <TH align="center">Flag</TH>
        </tr>
      </THead>
      <TBody>
        {employees.map((emp) => {
          const total = weeklyTotal(emp.id)
          const overWeek = total > WEEKLY_OT_THRESHOLD
          const overDay = days.some((d) => (hoursFor(emp.id, toISODate(d)) ?? 0) > DAILY_OT_THRESHOLD)
          return (
            <TR key={emp.id}>
              <TD className="sticky left-0 z-10 bg-white">
                <div className="flex items-center gap-2.5">
                  <Avatar name={emp.full_name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{emp.full_name}</p>
                    <p className="truncate text-xs text-gray-500">{emp.branch ?? '—'}</p>
                  </div>
                </div>
              </TD>
              {days.map((day) => {
                const iso = toISODate(day)
                return (
                  <TD key={iso} className="p-1.5" align="center">
                    <HoursCell
                      value={hoursFor(emp.id, iso)}
                      saving={savingCell === `${emp.id}|${iso}`}
                      label={`Hours for ${emp.full_name} on ${format(day, 'EEEE MMM d')}`}
                      onCommit={(hours) => setHours(emp.id, iso, hours)}
                    />
                  </TD>
                )
              })}
              <TD align="right" className={`font-semibold ${overWeek ? 'text-danger' : 'text-gray-900'}`}>
                {total.toFixed(2).replace(/\.00$/, '')}
              </TD>
              <TD align="center">
                {overWeek || overDay ? (
                  <Badge tone="flagged">{overWeek ? 'over 40h' : 'over 10h/day'}</Badge>
                ) : (
                  <Badge tone="normal">normal</Badge>
                )}
              </TD>
            </TR>
          )
        })}
      </TBody>
    </Table>
  )
}
