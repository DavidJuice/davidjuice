import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Tabs from '../components/ui/Tabs.jsx'
import { Select, SearchInput } from '../components/ui/Input.jsx'
import {
  EmptyState,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableSkeleton,
} from '../components/ui/Table.jsx'
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconUsers,
} from '../components/ui/Icons.jsx'
import VacationTable from '../components/vacation/VacationTable.jsx'
import VacationRequestModal from '../components/vacation/VacationRequestModal.jsx'
import PTOBar from '../components/vacation/PTOBar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useEmployees } from '../hooks/useEmployees.js'
import { useOrg } from '../hooks/useOrg.js'
import { useVacation } from '../hooks/useVacation.js'
import { WEEK_OPTIONS, rangesOverlap, toISODate } from '../lib/dates.js'

const TYPE_TONE = {
  annual: 'bg-[#E8F8F1] text-[#2E9E6D]',
  sick: 'bg-[#FEF2F2] text-[#E24B4A]',
  personal: 'bg-[#EEF2FF] text-[#4F46E5]',
  unpaid: 'bg-gray-100 text-gray-600',
}

export default function Vacation() {
  const { isManager } = useAuth()
  const { branches } = useOrg()
  const { employees, activeEmployees, loading: employeesLoading } = useEmployees()
  const {
    requests,
    pending,
    loading,
    error,
    refetch,
    createRequest,
    setStatus,
  } = useVacation()

  const [tab, setTab] = useState('requests')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false
      if (branchFilter !== 'all' && req.employees?.branch !== branchFilter) return false
      if (!term) return true
      return [req.employees?.full_name, req.type, req.notes]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term))
    })
  }, [requests, search, statusFilter, branchFilter])

  async function review(request, status) {
    setBusyId(`${request.id}:${status}`)
    try {
      await setStatus(request.id, status)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageWrapper
      title="Vacation"
      subtitle="Requests, team calendar and PTO balances."
      actions={
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <IconPlus className="h-4 w-4" />
          New request
        </Button>
      }
    >
      <Card bodyClassName="">
        <Tabs
          className="px-2"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'requests', label: 'Requests', count: pending.length },
            { id: 'calendar', label: 'Calendar' },
            { id: 'balances', label: 'PTO Balances' },
          ]}
        />

        {tab === 'requests' && (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b-[0.5px] border-hairline px-5 py-4">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search employee, type, notes…"
                className="w-full sm:max-w-xs"
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-40"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
              <Select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full sm:w-44"
                aria-label="Filter by branch"
              >
                <option value="all">All branches</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
              <span className="ml-auto text-[13px] text-gray-500">{filtered.length} shown</span>
            </div>
            <VacationTable
              requests={filtered}
              loading={loading}
              error={error}
              canReview={isManager}
              busyId={busyId}
              onApprove={(r) => review(r, 'approved')}
              onReject={(r) => review(r, 'rejected')}
              onRetry={refetch}
              onCreate={() => setModalOpen(true)}
            />
          </>
        )}

        {tab === 'calendar' && <LeaveCalendar requests={requests} loading={loading} />}

        {tab === 'balances' && (
          <BalancesTab
            employees={employees}
            requests={requests}
            loading={employeesLoading}
            search={search}
            onSearch={setSearch}
          />
        )}
      </Card>

      <VacationRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employees={activeEmployees}
        onSubmit={createRequest}
        canApprove={isManager}
      />
    </PageWrapper>
  )
}

/** Month grid of approved + pending leave, one chip per person per day. */
function LeaveCalendar({ requests, loading }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), WEEK_OPTIONS)
    const end = endOfWeek(endOfMonth(cursor), WEEK_OPTIONS)
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const visible = useMemo(
    () => requests.filter((r) => r.status !== 'rejected'),
    [requests]
  )

  if (loading) {
    return (
      <div className="grid grid-cols-7 gap-2 p-5">
        {Array.from({ length: 35 }).map((_, i) => (
          <span key={i} className="skeleton h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-gray-900">{format(cursor, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setCursor((c) => addMonths(c, -1))}>
            <IconChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setCursor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setCursor((c) => addMonths(c, 1))}>
            <IconChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border-[0.5px] border-hairline bg-hairline">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="bg-[#FAFBFC] px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {d}
          </div>
        ))}
        {grid.map((day) => {
          const iso = toISODate(day)
          const dayRequests = visible.filter((r) => rangesOverlap(r.start_date, r.end_date, iso, iso))
          const inMonth = isSameMonth(day, cursor)
          const isToday = iso === toISODate(new Date())
          return (
            <div
              key={iso}
              className={`min-h-[92px] bg-white p-1.5 ${inMonth ? '' : 'bg-[#FCFCFD]'}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    isToday
                      ? 'bg-brand font-semibold text-white'
                      : inMonth
                        ? 'text-gray-700'
                        : 'text-gray-300'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-1">
                {dayRequests.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    title={`${r.employees?.full_name} · ${r.type} (${r.status})`}
                    className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      TYPE_TONE[r.type] ?? TYPE_TONE.unpaid
                    } ${r.status === 'pending' ? 'opacity-60' : ''}`}
                  >
                    {r.employees?.full_name ?? 'Unknown'}
                  </div>
                ))}
                {dayRequests.length > 3 && (
                  <p className="px-1.5 text-[11px] text-gray-400">+{dayRequests.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-gray-500">
        {Object.entries(TYPE_TONE).map(([type, cls]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${cls.split(' ')[0]}`} />
            <span className="capitalize">{type}</span>
          </span>
        ))}
        <span className="text-gray-400">Faded chips are pending approval.</span>
      </div>
    </div>
  )
}

function BalancesTab({ employees, requests, loading, search, onSearch }) {
  const usedByEmployee = useMemo(() => {
    const map = new Map()
    const year = new Date().getFullYear()
    for (const req of requests) {
      if (req.status !== 'approved') continue
      if (new Date(req.start_date).getFullYear() !== year) continue
      map.set(req.employee_id, (map.get(req.employee_id) ?? 0) + Number(req.days_requested))
    }
    return map
  }, [requests])

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return employees
      .filter((e) => e.is_active)
      .filter((e) =>
        !term
          ? true
          : [e.full_name, e.branch, e.position].filter(Boolean).some((v) => v.toLowerCase().includes(term))
      )
  }, [employees, search])

  if (loading) return <TableSkeleton columns={5} rows={5} />

  if (!rows.length) {
    return (
      <EmptyState
        icon={<IconUsers className="h-5 w-5" />}
        title={employees.length ? 'No matching employees' : 'No employees yet'}
        description={
          employees.length
            ? 'Adjust the search to see more people.'
            : 'Add employees to track their PTO balances.'
        }
      />
    )
  }

  return (
    <>
      <div className="border-b-[0.5px] border-hairline px-5 py-4">
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder="Search employee or branch…"
          className="w-full sm:max-w-xs"
        />
      </div>
      <Table>
        <THead>
          <tr>
            <TH>Employee</TH>
            <TH>Branch</TH>
            <TH align="right">Used this year</TH>
            <TH>Remaining</TH>
            <TH align="right">Days left</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((emp) => (
            <TR key={emp.id}>
              <TD>
                <div className="flex items-center gap-2.5">
                  <Avatar name={emp.full_name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{emp.full_name}</p>
                    <p className="truncate text-xs text-gray-500">{emp.position ?? '—'}</p>
                  </div>
                </div>
              </TD>
              <TD>{emp.branch ?? '—'}</TD>
              <TD align="right">{(usedByEmployee.get(emp.id) ?? 0).toFixed(1)}</TD>
              <TD className="w-56">
                <PTOBar remaining={emp.pto_balance_days} />
              </TD>
              <TD align="right" className="font-medium text-gray-900">
                {Number(emp.pto_balance_days).toFixed(1)}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  )
}
