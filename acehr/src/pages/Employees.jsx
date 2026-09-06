import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input, { Select, SearchInput } from '../components/ui/Input.jsx'
import Modal from '../components/ui/Modal.jsx'
import PTOBar from '../components/vacation/PTOBar.jsx'
import {
  EmptyState,
  ErrorState,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableSkeleton,
} from '../components/ui/Table.jsx'
import { IconPlus, IconUsers } from '../components/ui/Icons.jsx'
import { useEmployees } from '../hooks/useEmployees.js'
import { useOrg } from '../hooks/useOrg.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatCurrency, formatSeatLimit, seatLimitFor } from '../lib/stripe.js'
import { formatDate, toISODate } from '../lib/dates.js'

const emptyForm = (branch) => ({
  full_name: '',
  email: '',
  branch: branch ?? '',
  position: '',
  hire_date: toISODate(new Date()),
  hourly_rate: '',
  pto_balance_days: '15',
})

export default function Employees() {
  const { isAdmin, org } = useAuth()
  const { branches } = useOrg()
  const { employees, activeEmployees, loading, error, refetch, createEmployee, updateEmployee, setActive } =
    useEmployees()

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return employees.filter((emp) => {
      if (branchFilter !== 'all' && emp.branch !== branchFilter) return false
      if (statusFilter === 'active' && !emp.is_active) return false
      if (statusFilter === 'inactive' && emp.is_active) return false
      if (!term) return true
      return [emp.full_name, emp.email, emp.position, emp.branch]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term))
    })
  }, [employees, search, branchFilter, statusFilter])

  const seatLimit = seatLimitFor(org?.plan)
  const atSeatLimit = activeEmployees.length >= seatLimit

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(employee) {
    setEditing(employee)
    setModalOpen(true)
  }

  async function toggleActive(employee) {
    try {
      await setActive(employee.id, !employee.is_active)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <PageWrapper
      title="Employees"
      subtitle={`${activeEmployees.length} active of ${formatSeatLimit(org?.plan)} seats`}
      actions={
        isAdmin && (
          <Button size="sm" onClick={openCreate} disabled={atSeatLimit}>
            <IconPlus className="h-4 w-4" />
            Add employee
          </Button>
        )
      }
    >
      {atSeatLimit && (
        <div className="mb-4 rounded-card border-[0.5px] border-warn/40 bg-warn-light px-4 py-3 text-sm text-[#9A5A20]">
          You have reached the {formatSeatLimit(org?.plan)}-seat limit on the{' '}
          <span className="capitalize">{org?.plan}</span> plan. Upgrade from Billing to add more
          employees.
        </div>
      )}

      <Card bodyClassName="">
        <div className="flex flex-wrap items-center gap-3 border-b-[0.5px] border-hairline px-5 py-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, email, position…"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <span className="ml-auto text-[13px] text-gray-500">{filtered.length} shown</span>
        </div>

        {loading ? (
          <TableSkeleton columns={7} rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<IconUsers className="h-5 w-5" />}
            title={employees.length ? 'No matching employees' : 'No employees yet'}
            description={
              employees.length
                ? 'Adjust the search or filters to see more people.'
                : 'Add your first employee to start tracking PTO and hours.'
            }
            action={
              isAdmin &&
              !employees.length && (
                <Button size="sm" onClick={openCreate}>
                  Add employee
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Employee</TH>
                <TH>Branch</TH>
                <TH>Position</TH>
                <TH>Hired</TH>
                <TH align="right">Rate</TH>
                <TH>PTO balance</TH>
                <TH>Status</TH>
                {isAdmin && <TH align="right">Actions</TH>}
              </tr>
            </THead>
            <TBody>
              {filtered.map((emp) => (
                <TR key={emp.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={emp.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{emp.full_name}</p>
                        <p className="truncate text-xs text-gray-500">{emp.email ?? '—'}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>{emp.branch ?? '—'}</TD>
                  <TD>{emp.position ?? '—'}</TD>
                  <TD className="text-gray-500">{formatDate(emp.hire_date)}</TD>
                  <TD align="right">
                    {emp.hourly_rate ? `${formatCurrency(emp.hourly_rate)}/hr` : '—'}
                  </TD>
                  <TD className="w-48">
                    <PTOBar remaining={emp.pto_balance_days} />
                  </TD>
                  <TD>
                    <Badge tone={emp.is_active ? 'active' : 'inactive'}>
                      {emp.is_active ? 'active' : 'inactive'}
                    </Badge>
                  </TD>
                  {isAdmin && (
                    <TD align="right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(emp)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={emp.is_active ? 'ghost' : 'secondary'}
                          onClick={() => toggleActive(emp)}
                        >
                          {emp.is_active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <EmployeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        branches={branches}
        employee={editing}
        onCreate={createEmployee}
        onUpdate={updateEmployee}
      />
    </PageWrapper>
  )
}

function EmployeeModal({ open, onClose, branches, employee, onCreate, onUpdate }) {
  const isEdit = Boolean(employee)
  const [form, setForm] = useState(emptyForm(branches[0]))
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [initialised, setInitialised] = useState(null)

  // Reseed the form whenever the modal opens for a different record.
  const seedKey = `${open}:${employee?.id ?? 'new'}`
  if (open && initialised !== seedKey) {
    setInitialised(seedKey)
    setErrors({})
    setForm(
      employee
        ? {
            full_name: employee.full_name ?? '',
            email: employee.email ?? '',
            branch: employee.branch ?? '',
            position: employee.position ?? '',
            hire_date: employee.hire_date ?? toISODate(new Date()),
            hourly_rate: employee.hourly_rate == null ? '' : String(employee.hourly_rate),
            pto_balance_days: String(employee.pto_balance_days ?? 15),
          }
        : emptyForm(branches[0])
    )
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.full_name.trim()) next.full_name = 'Name is required.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Enter a valid email.'
    }
    if (!form.branch) next.branch = 'Pick a branch.'
    if (form.hourly_rate !== '' && Number(form.hourly_rate) < 0) {
      next.hourly_rate = 'Rate cannot be negative.'
    }
    if (form.pto_balance_days !== '' && Number(form.pto_balance_days) < 0) {
      next.pto_balance_days = 'PTO days cannot be negative.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      branch: form.branch,
      position: form.position.trim() || null,
      hire_date: form.hire_date || null,
      hourly_rate: form.hourly_rate === '' ? null : Number(form.hourly_rate),
      pto_balance_days: form.pto_balance_days === '' ? 0 : Number(form.pto_balance_days),
    }
    try {
      if (isEdit) {
        await onUpdate(employee.id, payload)
        toast.success(`${payload.full_name} updated.`)
      } else {
        await onCreate(payload)
      }
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit employee' : 'Add employee'}
      description={isEdit ? employee.full_name : 'Create a record for a new team member.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" loading={submitting}>
            {isEdit ? 'Save changes' : 'Add employee'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            error={errors.full_name}
            placeholder="Marcus Hale"
          />
          <Input
            type="email"
            label="Email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email}
            placeholder="marcus@agency.com"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Branch"
            value={form.branch}
            onChange={(e) => update('branch', e.target.value)}
            error={errors.branch}
          >
            <option value="">Select a branch…</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Input
            label="Position"
            value={form.position}
            onChange={(e) => update('position', e.target.value)}
            placeholder="Senior Agent"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            type="date"
            label="Hire date"
            value={form.hire_date}
            onChange={(e) => update('hire_date', e.target.value)}
          />
          <Input
            type="number"
            step="0.25"
            min="0"
            label="Hourly rate"
            value={form.hourly_rate}
            onChange={(e) => update('hourly_rate', e.target.value)}
            error={errors.hourly_rate}
            placeholder="32.00"
          />
          <Input
            type="number"
            step="0.5"
            min="0"
            label="PTO days"
            value={form.pto_balance_days}
            onChange={(e) => update('pto_balance_days', e.target.value)}
            error={errors.pto_balance_days}
          />
        </div>
      </form>
    </Modal>
  )
}
