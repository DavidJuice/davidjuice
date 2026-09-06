import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import Button from '../components/ui/Button.jsx'
import Card, { StatCard } from '../components/ui/Card.jsx'
import { Select, SearchInput } from '../components/ui/Input.jsx'
import { IconChevronLeft, IconChevronRight, IconClock, IconTrend } from '../components/ui/Icons.jsx'
import WeeklyHoursGrid from '../components/hours/WeeklyHoursGrid.jsx'
import WorkHoursTable from '../components/hours/WorkHoursTable.jsx'
import { useEmployees } from '../hooks/useEmployees.js'
import { useOrg } from '../hooks/useOrg.js'
import { WEEKLY_OT_THRESHOLD, useHours } from '../hooks/useHours.js'
import { shiftWeek, weekStart } from '../lib/dates.js'

export default function WorkHours() {
  const { branches } = useOrg()
  const { activeEmployees, loading: employeesLoading } = useEmployees()
  const [anchor, setAnchor] = useState(() => weekStart(new Date()))
  const {
    days,
    logs,
    loading,
    error,
    savingCell,
    hoursFor,
    weeklyTotal,
    setHours,
    refetch,
  } = useHours(anchor)

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')

  const visibleEmployees = useMemo(() => {
    const term = search.trim().toLowerCase()
    return activeEmployees.filter((emp) => {
      if (branchFilter !== 'all' && emp.branch !== branchFilter) return false
      if (!term) return true
      return [emp.full_name, emp.position, emp.branch]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term))
    })
  }, [activeEmployees, search, branchFilter])

  const employeesById = useMemo(
    () => new Map(activeEmployees.map((e) => [e.id, e])),
    [activeEmployees]
  )

  const totals = useMemo(() => {
    const hours = logs.reduce((sum, l) => sum + Number(l.hours_worked ?? 0), 0)
    const flagged = visibleEmployees.filter((e) => weeklyTotal(e.id) > WEEKLY_OT_THRESHOLD).length
    return { hours, flagged }
  }, [logs, visibleEmployees, weeklyTotal])

  const isCurrentWeek =
    format(anchor, 'yyyy-MM-dd') === format(weekStart(new Date()), 'yyyy-MM-dd')

  return (
    <PageWrapper
      title="Work Hours"
      subtitle="Click any cell to log hours. Days over 10h or weeks over 40h are flagged."
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Hours logged this week"
          value={loading ? '—' : totals.hours.toFixed(1)}
          hint={`${format(days[0], 'MMM d')} – ${format(days[4], 'MMM d, yyyy')}`}
          tone="brand"
          icon={<IconClock className="h-5 w-5" />}
        />
        <StatCard
          label="Employees over 40h"
          value={loading ? '—' : totals.flagged}
          hint="Weekly overtime threshold"
          tone="danger"
          icon={<IconTrend className="h-5 w-5" />}
        />
        <StatCard
          label="Employees tracked"
          value={employeesLoading ? '—' : visibleEmployees.length}
          hint={branchFilter === 'all' ? 'All branches' : branchFilter}
          tone="indigo"
          icon={<IconClock className="h-5 w-5" />}
        />
      </div>

      <Card bodyClassName="">
        <div className="flex flex-wrap items-center gap-3 border-b-[0.5px] border-hairline px-5 py-4">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              aria-label="Previous week"
              onClick={() => setAnchor((d) => shiftWeek(d, -1))}
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={isCurrentWeek ? 'primary' : 'secondary'}
              onClick={() => setAnchor(weekStart(new Date()))}
            >
              This week
            </Button>
            <Button
              size="sm"
              variant="secondary"
              aria-label="Next week"
              onClick={() => setAnchor((d) => shiftWeek(d, 1))}
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
          </div>

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
          <span className="ml-auto text-[13px] text-gray-500">
            Week of {format(days[0], 'MMM d, yyyy')}
          </span>
        </div>

        <WeeklyHoursGrid
          employees={visibleEmployees}
          days={days}
          loading={loading || employeesLoading}
          error={error}
          hoursFor={hoursFor}
          weeklyTotal={weeklyTotal}
          setHours={setHours}
          savingCell={savingCell}
          onRetry={refetch}
        />
      </Card>

      <Card className="mt-5" title="Shift log" subtitle="Individual entries for this week" bodyClassName="">
        <WorkHoursTable logs={logs} employeesById={employeesById} loading={loading} />
      </Card>
    </PageWrapper>
  )
}
