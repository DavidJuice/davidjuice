import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import { AuthShell } from './Login.jsx'
import { signUpAgency } from '../lib/auth.js'
import { useAuth } from '../context/AuthContext.jsx'

const emptyForm = {
  fullName: '',
  agencyName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export default function Signup() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  if (!loading && session && !submitting) return <Navigate to="/dashboard" replace />

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.fullName.trim()) next.fullName = 'Your name is required.'
    if (!form.agencyName.trim()) next.agencyName = 'Agency name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email.'
    if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const result = await signUpAgency({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        agencyName: form.agencyName.trim(),
      })
      if (result.needsConfirmation) {
        setConfirmationSent(true)
        toast.success('Check your inbox to confirm your email.')
        return
      }
      toast.success(`${form.agencyName} is ready.`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmationSent) {
    return (
      <AuthShell
        title="Confirm your email"
        subtitle={`We sent a confirmation link to ${form.email}.`}
        footer={
          <Link to="/login" className="font-medium text-brand hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="card p-5 text-sm text-gray-600">
          Open the link to activate your account. Your agency workspace is created the first time
          you sign in.
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your agency"
      subtitle="14 days of the Starter plan, no card required."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Your name"
          autoComplete="name"
          value={form.fullName}
          onChange={(e) => update('fullName', e.target.value)}
          error={errors.fullName}
          placeholder="Dana Reyes"
        />
        <Input
          label="Agency name"
          autoComplete="organization"
          value={form.agencyName}
          onChange={(e) => update('agencyName', e.target.value)}
          error={errors.agencyName}
          placeholder="Ace Insurance Group"
        />
        <Input
          type="email"
          label="Work email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
          placeholder="you@agency.com"
        />
        <Input
          type="password"
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
        />
        <Input
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create agency
        </Button>
      </form>
    </AuthShell>
  )
}
