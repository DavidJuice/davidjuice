import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../ui/Button.jsx'
import Input, { Select, Textarea } from '../ui/Input.jsx'
import Modal from '../ui/Modal.jsx'
import { businessDaysBetween, toISODate } from '../../lib/dates.js'

const TYPES = [
  { value: 'annual', label: 'Annual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'personal', label: 'Personal' },
  { value: 'unpaid', label: 'Unpaid' },
]

const emptyForm = () => ({
  employee_id: '',
  type: 'annual',
  start_date: toISODate(new Date()),
  end_date: toISODate(new Date()),
  notes: '',
})

export default function VacationRequestModal({ open, onClose, employees, onSubmit, canApprove }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(emptyForm())
      setErrors({})
    }
  }, [open])

  // Days are business days, matching how the PTO ledger debits balances.
  const days = useMemo(
    () => businessDaysBetween(form.start_date, form.end_date),
    [form.start_date, form.end_date]
  )

  const selected = employees.find((e) => e.id === form.employee_id)
  const deducts = form.type === 'annual' || form.type === 'personal'
  const balanceAfter = selected ? Number(selected.pto_balance_days) - (deducts ? days : 0) : null

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.employee_id) next.employee_id = 'Pick an employee.'
    if (!form.start_date) next.start_date = 'Start date is required.'
    if (!form.end_date) next.end_date = 'End date is required.'
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      next.end_date = 'End date cannot be before the start date.'
    }
    if (form.start_date && form.end_date && days === 0) {
      next.end_date = 'That range contains no working days.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit({
        employee_id: form.employee_id,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        days_requested: days,
        notes: form.notes.trim() || null,
        status: 'pending',
      })
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
      title="New vacation request"
      description="Days are calculated from working days (Mon–Fri) in the range."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="vacation-request-form" loading={submitting}>
            Submit request
          </Button>
        </>
      }
    >
      <form id="vacation-request-form" onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Employee"
          value={form.employee_id}
          onChange={(e) => update('employee_id', e.target.value)}
          error={errors.employee_id}
        >
          <option value="">Select an employee…</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name} · {emp.branch ?? 'No branch'}
            </option>
          ))}
        </Select>

        <Select label="Type" value={form.type} onChange={(e) => update('type', e.target.value)}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            type="date"
            label="Start date"
            value={form.start_date}
            onChange={(e) => update('start_date', e.target.value)}
            error={errors.start_date}
          />
          <Input
            type="date"
            label="End date"
            value={form.end_date}
            min={form.start_date}
            onChange={(e) => update('end_date', e.target.value)}
            error={errors.end_date}
          />
        </div>

        <div className="rounded-lg border-[0.5px] border-hairline bg-[#FAFBFC] px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Working days requested</span>
            <span className="font-semibold text-gray-900">{days}</span>
          </div>
          {selected && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-gray-600">
                {deducts ? 'PTO balance after approval' : 'PTO balance (unaffected)'}
              </span>
              <span
                className={`font-semibold ${
                  balanceAfter < 0 ? 'text-danger' : 'text-gray-900'
                }`}
              >
                {balanceAfter.toFixed(1)} d
              </span>
            </div>
          )}
          {selected && deducts && balanceAfter < 0 && (
            <p className="mt-1.5 text-xs text-danger">
              This exceeds the remaining balance. It can still be submitted for review.
            </p>
          )}
        </div>

        <Textarea
          label="Notes"
          placeholder="Optional context for the reviewer"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
        />

        {canApprove && (
          <p className="text-xs text-gray-400">
            Submitted as pending — approve it from the requests table.
          </p>
        )}
      </form>
    </Modal>
  )
}
