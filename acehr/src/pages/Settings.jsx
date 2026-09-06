import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input, { Select } from '../components/ui/Input.jsx'
import { IconBuilding, IconMail, IconPlus, IconX } from '../components/ui/Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useOrg } from '../hooks/useOrg.js'
import { useEmployees } from '../hooks/useEmployees.js'
import { supabase } from '../lib/supabase.js'
import { formatSeatLimit, getPlan } from '../lib/stripe.js'

export default function Settings() {
  const { org, isAdmin } = useAuth()
  const { branches, renameOrg, addBranch, removeBranch, saving } = useOrg()
  const { activeEmployees } = useEmployees()

  const [companyName, setCompanyName] = useState(org?.name ?? '')
  const [newBranch, setNewBranch] = useState('')

  useEffect(() => {
    setCompanyName(org?.name ?? '')
  }, [org?.name])

  const plan = getPlan(org?.plan)

  async function handleRename(event) {
    event.preventDefault()
    try {
      await renameOrg(companyName)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleAddBranch(event) {
    event.preventDefault()
    try {
      await addBranch(newBranch)
      setNewBranch('')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleRemoveBranch(branch) {
    const inUse = activeEmployees.some((e) => e.branch === branch)
    if (inUse) {
      toast.error(`${branch} still has active employees assigned.`)
      return
    }
    try {
      await removeBranch(branch)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <PageWrapper title="Settings" subtitle="Company profile, branches, invites and plan.">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Company" subtitle="How your agency appears across AceHR.">
          <form onSubmit={handleRename} className="space-y-4">
            <Input
              label="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={!isAdmin}
              hint={isAdmin ? undefined : 'Only admins can change this.'}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="field-label">Workspace slug</span>
                <p className="rounded-lg border border-hairline bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  {org?.slug ?? '—'}
                </p>
              </div>
              <div>
                <span className="field-label">Created</span>
                <p className="rounded-lg border border-hairline bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  {org?.created_at ? new Date(org.created_at).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button type="submit" loading={saving} disabled={companyName.trim() === (org?.name ?? '')}>
                Save changes
              </Button>
            )}
          </form>
        </Card>

        <Card title="Plan" subtitle="Change or cancel from the Billing page.">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <Badge tone="approved">${plan.priceMonthly}/mo</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">{plan.blurb}</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand-text">
              <IconBuilding className="h-5 w-5" />
            </span>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t-[0.5px] border-hairline pt-4 text-sm">
            <div>
              <dt className="text-gray-500">Seats used</dt>
              <dd className="mt-0.5 font-medium text-gray-900">
                {activeEmployees.length} / {formatSeatLimit(org?.plan)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Subscription</dt>
              <dd className="mt-0.5 font-medium text-gray-900">
                {org?.stripe_subscription_id ? 'Active' : 'Not started'}
              </dd>
            </div>
          </dl>
          <a
            href="/billing"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-hairline bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage billing
          </a>
        </Card>

        <Card title="Branches" subtitle="Locations available when assigning employees.">
          {isAdmin && (
            <form onSubmit={handleAddBranch} className="mb-4 flex gap-2">
              <Input
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                placeholder="Add a branch, e.g. Bellevue"
                className="flex-1"
                aria-label="New branch name"
              />
              <Button type="submit" loading={saving} disabled={!newBranch.trim()}>
                <IconPlus className="h-4 w-4" />
                Add
              </Button>
            </form>
          )}
          <ul className="divide-y divide-hairline rounded-lg border-[0.5px] border-hairline">
            {branches.map((branch) => {
              const count = activeEmployees.filter((e) => e.branch === branch).length
              return (
                <li key={branch} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{branch}</p>
                    <p className="text-xs text-gray-500">
                      {count} active {count === 1 ? 'employee' : 'employees'}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBranch(branch)}
                      aria-label={`Remove ${branch}`}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-danger-light hover:text-danger"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>

        <InviteCard isAdmin={isAdmin} branches={branches} />
      </div>
    </PageWrapper>
  )
}

/**
 * Invites a teammate. The serverless endpoint holds the service-role key and
 * issues the Supabase auth invite plus a Resend notification.
 */
function InviteCard({ isAdmin, branches }) {
  const [form, setForm] = useState({ email: '', fullName: '', role: 'employee', branch: branches[0] ?? '' })
  const [sending, setSending] = useState(false)

  async function handleInvite(event) {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Enter a valid email address.')
      return
    }
    setSending(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify(form),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Invite failed.')
      toast.success(`Invite sent to ${form.email}.`)
      setForm((f) => ({ ...f, email: '', fullName: '' }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Card title="Invite a teammate" subtitle="Sends a Supabase auth invite to set a password.">
      {!isAdmin ? (
        <p className="text-sm text-gray-500">Only admins can send invites.</p>
      ) : (
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="email"
              label="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="teammate@agency.com"
            />
            <Input
              label="Full name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Priya Raman"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </Select>
            <Select
              label="Branch"
              value={form.branch}
              onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" loading={sending} disabled={!form.email.trim()}>
            <IconMail className="h-4 w-4" />
            Send invite
          </Button>
        </form>
      )}
    </Card>
  )
}
