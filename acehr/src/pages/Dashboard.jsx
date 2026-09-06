import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import Button from '../components/ui/Button.jsx'
import Card, { StatCard } from '../components/ui/Card.jsx'
import { EmptyState } from '../components/ui/Table.jsx'
import { IconCalendar, IconClock, IconPlus, IconTrend, IconUsers } from '../components/ui/Icons.jsx'
import VacationTable from '../components/vacation/VacationTable.jsx'
import VacationRequestModal from '../components/vacation/VacationRequestModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useEmployees } from '../hooks/useEmployees.js'
import { useVacation } from '../hooks/useVacation.js'
import { useMonthlyOvertime } from '../hooks/useHours.js'
import { formatRange } from '../lib/dates.js'

export default function Dashboard() {
  const { profile, isManager } = useAuth()
  const { activeEmployees, loading: employeesLoading } = useEmployees()
  const {
    requests,
    pending,
    onLeaveToday,
    onLeaveThisWeek,
    loading: vacationLoading,
    error: vacationError,
    refetch,
    createRequest,
    setStatus,
  } = useVacation()
  const { hours: otHours, loading: otLoading } = useMonthlyOvertime()

  const [modalOpen, setModalOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const recent = useMemo(() => requests.slice(0, 5), [requests])
  const firstName = (profile?.full_name ?? '').split(' ')[0]

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
      title={firstName ? `Good to see you, ${firstName}` : 'Dashboard'}
      subtitle="Today's headcount, leave and overtime at a glance."
      actions={
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <IconPlus className="h-4 w-4" />
          New request
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total employees"
          value={employeesLoading ? '—' : activeEmployees.length}
          hint="Active headcount"
          tone="brand"
          icon={<IconUsers className="h-5 w-5" />}
        />
        <StatCard
          label="On leave today"
          value={vacationLoading ? '—' : onLeaveToday.length}
          hint="Approved absences"
          tone="warn"
          icon={<IconCalendar className="h-5 w-5" />}
        />
        <StatCard
          label="Pending requests"
          value={vacationLoading ? '—' : pending.length}
          hint={pending.length ? 'Awaiting review' : 'Nothing to review'}
          tone="danger"
          icon={<IconClock className="h-5 w-5" />}
        />
        <StatCard
          label="OT hours this month"
          value={otLoading ? '—' : otHours}
          hint="Hours past 8/day"
          tone="indigo"
          icon={<IconTrend className="h-5 w-5" />}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Recent vacation requests"
          subtitle="Last 5 submissions"
          bodyClassName=""
          action={
            <Link to="/vacation" className="text-[13px] font-medium text-brand hover:underline">
              View all
            </Link>
          }
        >
          <VacationTable
            requests={recent}
            loading={vacationLoading}
            error={vacationError}
            canReview={isManager}
            busyId={busyId}
            onApprove={(r) => review(r, 'approved')}
            onReject={(r) => review(r, 'rejected')}
            onRetry={refetch}
            onCreate={() => setModalOpen(true)}
          />
        </Card>

        <Card title="On leave this week" subtitle="Approved time off, Mon–Sun">
          {vacationLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="skeleton h-9 w-9 rounded-full" />
                  <span className="skeleton h-3.5 w-40" />
                </div>
              ))}
            </div>
          ) : onLeaveThisWeek.length === 0 ? (
            <EmptyState
              icon={<IconCalendar className="h-5 w-5" />}
              title="Everyone is in"
              description="No approved leave overlaps this week."
            />
          ) : (
            <ul className="space-y-3">
              {onLeaveThisWeek.map((req) => (
                <li key={req.id} className="flex items-center gap-3">
                  <Avatar name={req.employees?.full_name} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {req.employees?.full_name ?? 'Unknown'}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      <span className="capitalize">{req.type}</span> ·{' '}
                      {formatRange(req.start_date, req.end_date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

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
