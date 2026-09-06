import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import Button from '../components/ui/Button.jsx'
import Card, { StatCard } from '../components/ui/Card.jsx'
import { Select, SearchInput } from '../components/ui/Input.jsx'
import { IconDownload, IconTrend } from '../components/ui/Icons.jsx'
import OvertimeTable from '../components/overtime/OvertimeTable.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useOrg } from '../hooks/useOrg.js'
import { useOvertime } from '../hooks/useOvertime.js'
import { downloadCSV } from '../lib/csv.js'
import { formatCurrency } from '../lib/stripe.js'
import { formatDate } from '../lib/dates.js'

const CSV_COLUMNS = [
  { label: 'Employee', value: (r) => r.employees?.full_name ?? '' },
  { label: 'Branch', value: (r) => r.employees?.branch ?? '' },
  { label: 'Week start', value: (r) => r.week_start },
  { label: 'Regular hours', value: (r) => Number(r.regular_hours ?? 0).toFixed(2) },
  { label: 'Overtime hours', value: (r) => Number(r.overtime_hours ?? 0).toFixed(2) },
  { label: 'Hourly rate', value: (r) => Number(r.employees?.hourly_rate ?? 0).toFixed(2) },
  { label: 'OT pay estimate', value: (r) => Number(r.ot_pay_estimate ?? 0).toFixed(2) },
  { label: 'Status', value: (r) => r.status },
]

export default function Overtime() {
  const { isManager } = useAuth()
  const { branches } = useOrg()
  const { records, weeks, loading, error, refetch, setStatus } = useOvertime()

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [weekFilter, setWeekFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return records.filter((rec) => {
      if (branchFilter !== 'all' && rec.employees?.branch !== branchFilter) return false
      if (weekFilter !== 'all' && rec.week_start !== weekFilter) return false
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false
      if (!term) return true
      return [rec.employees?.full_name, rec.employees?.branch]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term))
    })
  }, [records, search, branchFilter, weekFilter, statusFilter])

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, rec) => ({
          hours: acc.hours + Number(rec.overtime_hours ?? 0),
          pay: acc.pay + Number(rec.ot_pay_estimate ?? 0),
        }),
        { hours: 0, pay: 0 }
      ),
    [filtered]
  )

  async function handleSetStatus(id, status) {
    setBusyId(`${id}:${status}`)
    try {
      await setStatus(id, status)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function handleExport() {
    if (!filtered.length) {
      toast.error('Nothing to export with these filters.')
      return
    }
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCSV(`acehr-overtime-${stamp}.csv`, CSV_COLUMNS, filtered)
    toast.success(`Exported ${filtered.length} rows.`)
  }

  return (
    <PageWrapper
      title="Overtime"
      subtitle="Weekly rollups with 1.5× pay estimates."
      actions={
        <Button size="sm" variant="secondary" onClick={handleExport}>
          <IconDownload className="h-4 w-4" />
          Export CSV
        </Button>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Overtime hours"
          value={loading ? '—' : totals.hours.toFixed(1)}
          hint="Matching current filters"
          tone="indigo"
          icon={<IconTrend className="h-5 w-5" />}
        />
        <StatCard
          label="Estimated OT pay"
          value={loading ? '—' : formatCurrency(totals.pay)}
          hint="Hourly rate × 1.5"
          tone="warn"
          icon={<IconTrend className="h-5 w-5" />}
        />
        <StatCard
          label="Rows"
          value={loading ? '—' : filtered.length}
          hint={weekFilter === 'all' ? 'All weeks' : `Week of ${formatDate(weekFilter, 'MMM d')}`}
          tone="brand"
          icon={<IconTrend className="h-5 w-5" />}
        />
      </div>

      <Card bodyClassName="">
        <div className="flex flex-wrap items-center gap-3 border-b-[0.5px] border-hairline px-5 py-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search employee…"
            className="w-full sm:max-w-xs"
          />
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
          <Select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            className="w-full sm:w-48"
            aria-label="Filter by week"
          >
            <option value="all">All weeks</option>
            {weeks.map((w) => (
              <option key={w} value={w}>
                Week of {formatDate(w, 'MMM d, yyyy')}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-36"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </Select>
          <span className="ml-auto text-[13px] text-gray-500">{filtered.length} shown</span>
        </div>

        <OvertimeTable
          records={filtered}
          loading={loading}
          error={error}
          canReview={isManager}
          busyId={busyId}
          onSetStatus={handleSetStatus}
          onRetry={refetch}
        />
      </Card>
    </PageWrapper>
  )
}
