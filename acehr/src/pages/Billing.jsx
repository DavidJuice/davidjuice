import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import { IconAlert, IconCard, IconCheck } from '../components/ui/Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useEmployees } from '../hooks/useEmployees.js'
import {
  PLANS,
  PLAN_ORDER,
  createCheckoutSession,
  createPortalSession,
  formatSeatLimit,
  getPlan,
  seatLimitFor,
} from '../lib/stripe.js'

export default function Billing() {
  const { org, isAdmin, refreshProfile } = useAuth()
  const { activeEmployees, loading } = useEmployees()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState(null)

  const currentPlan = getPlan(org?.plan)
  const seatLimit = seatLimitFor(org?.plan)
  const used = activeEmployees.length
  const overLimit = used > seatLimit
  const hasSubscription = Boolean(org?.stripe_subscription_id)

  // Stripe redirects back with ?checkout=…; the webhook may land moments later,
  // so refresh the org once on return.
  useEffect(() => {
    const checkout = params.get('checkout')
    if (!checkout) return
    if (checkout === 'success') {
      toast.success('Subscription updated. It may take a moment to appear.')
      refreshProfile()
    } else {
      toast('Checkout cancelled.')
    }
    params.delete('checkout')
    setParams(params, { replace: true })
  }, [params, setParams, refreshProfile])

  async function openPortal() {
    setBusy('portal')
    try {
      window.location.href = await createPortalSession(org.id)
    } catch (err) {
      toast.error(err.message)
      setBusy(null)
    }
  }

  async function startCheckout(planId) {
    setBusy(planId)
    try {
      window.location.href = await createCheckoutSession(org.id, planId)
    } catch (err) {
      toast.error(err.message)
      setBusy(null)
    }
  }

  return (
    <PageWrapper
      title="Billing"
      subtitle="Your plan, seat usage and payment method."
      actions={
        isAdmin &&
        hasSubscription && (
          <Button size="sm" onClick={openPortal} loading={busy === 'portal'}>
            <IconCard className="h-4 w-4" />
            Manage subscription
          </Button>
        )
      }
    >
      {overLimit && (
        <div className="mb-5 flex items-start gap-3 rounded-card border-[0.5px] border-danger/40 bg-danger-light px-4 py-3 text-sm text-[#9B2C2C]">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            You have {used} active employees but the {currentPlan.name} plan allows{' '}
            {formatSeatLimit(org?.plan)}. Upgrade to stay within your seat limit.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Current plan">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-semibold tracking-tight text-gray-900">
                  {currentPlan.name}
                </h3>
                <Badge tone={hasSubscription ? 'approved' : 'pending'}>
                  {hasSubscription ? 'active' : 'no subscription'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">{currentPlan.blurb}</p>
            </div>
            <p className="text-right">
              <span className="text-2xl font-semibold text-gray-900">
                ${currentPlan.priceMonthly}
              </span>
              <span className="text-sm text-gray-500">/mo</span>
            </p>
          </div>

          <div className="mt-6 border-t-[0.5px] border-hairline pt-5">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="font-medium text-gray-700">Seat usage</span>
              <span className="text-gray-500">
                {loading ? '—' : `${used} of ${formatSeatLimit(org?.plan)}`}
              </span>
            </div>
            <ProgressBar
              value={used}
              max={Number.isFinite(seatLimit) ? seatLimit : Math.max(used, 1)}
              tone={overLimit ? 'danger' : used / seatLimit > 0.8 ? 'warn' : 'brand'}
            />
            <p className="mt-2 text-xs text-gray-400">
              Only active employees count toward your seat limit.
            </p>
          </div>
        </Card>

        <Card title="Payment method" subtitle="Handled securely by Stripe.">
          {hasSubscription ? (
            <>
              <p className="text-sm text-gray-600">
                Update your card, download invoices, or cancel from the Stripe Customer Portal.
              </p>
              <Button className="mt-4 w-full" onClick={openPortal} loading={busy === 'portal'} disabled={!isAdmin}>
                Open customer portal
              </Button>
              {!isAdmin && (
                <p className="mt-2 text-xs text-gray-400">Only admins can manage billing.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600">
              No active subscription. Pick a plan below to start one — you will be redirected to
              Stripe Checkout.
            </p>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-semibold text-gray-900">Plans</h2>
      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId]
          const isCurrent = planId === (org?.plan ?? 'starter')
          const tooSmall = used > plan.seatLimit
          return (
            <div
              key={planId}
              className={`card flex flex-col p-5 ${isCurrent ? 'ring-2 ring-brand' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                {isCurrent && <Badge tone="approved">current</Badge>}
              </div>
              <p className="mt-1 text-sm text-gray-500">{plan.blurb}</p>
              <p className="mt-4">
                <span className="text-2xl font-semibold text-gray-900">${plan.priceMonthly}</span>
                <span className="text-sm text-gray-500">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={tooSmall ? 'secondary' : 'primary'}
                    disabled={!isAdmin || tooSmall}
                    loading={busy === planId}
                    onClick={() => (hasSubscription ? openPortal() : startCheckout(planId))}
                  >
                    {tooSmall
                      ? `Needs ≤ ${plan.seatLimit} employees`
                      : hasSubscription
                        ? 'Change in portal'
                        : `Choose ${plan.name}`}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </PageWrapper>
  )
}
