import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to={location.state?.from ?? '/dashboard'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await signIn(form)
      toast.success('Welcome back.')
      navigate(location.state?.from ?? '/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Sign in to AceHR"
      subtitle="PTO, hours and overtime for your agency."
      footer={
        <>
          New agency?{' '}
          <Link to="/signup" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label="Work email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="you@agency.com"
        />
        <Input
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder="••••••••"
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}

/** Shared split layout for /login and /signup. */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="hidden w-1/2 flex-col justify-between bg-brand p-10 text-white lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-base font-bold">
            A
          </span>
          <span className="text-lg font-semibold tracking-tight">AceHR</span>
        </div>
        <div className="max-w-md">
          <p className="text-2xl font-semibold leading-snug">
            Run PTO, timesheets and overtime for every branch from one place.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/85">
            <li>• Approve time off without the email chain</li>
            <li>• Weekly hour grids that flag overtime automatically</li>
            <li>• Overtime pay estimates you can export to payroll</li>
          </ul>
        </div>
        <p className="text-xs text-white/70">Built for independent insurance agencies.</p>
      </div>

      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-base font-bold text-white">
              A
            </span>
            <span className="text-lg font-semibold tracking-tight text-gray-900">AceHR</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer && <p className="mt-6 text-center text-[13px] text-gray-500">{footer}</p>}
        </div>
      </div>
    </div>
  )
}
