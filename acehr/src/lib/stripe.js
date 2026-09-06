import { supabase } from './supabase.js'

/** Plan catalogue. Seat limits are enforced in the UI and on the server. */
export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 49,
    seatLimit: 10,
    priceId: import.meta.env.VITE_STRIPE_PRICE_STARTER,
    blurb: 'For a single branch getting off spreadsheets.',
    features: [
      'Up to 10 employees',
      'PTO requests & approvals',
      'Weekly work hours tracking',
      'Email support',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 99,
    seatLimit: 30,
    priceId: import.meta.env.VITE_STRIPE_PRICE_GROWTH,
    blurb: 'For multi-branch agencies with managers in the field.',
    features: [
      'Up to 30 employees',
      'Everything in Starter',
      'Overtime tracking & CSV export',
      'Branch-level filtering',
      'Priority support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 199,
    seatLimit: Infinity,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE,
    blurb: 'For agency groups running unlimited headcount.',
    features: [
      'Unlimited employees',
      'Everything in Growth',
      'Unlimited branches',
      'Dedicated onboarding',
    ],
  },
}

export const PLAN_ORDER = ['starter', 'growth', 'enterprise']

export function getPlan(planId) {
  return PLANS[planId] ?? PLANS.starter
}

export function seatLimitFor(planId) {
  return getPlan(planId).seatLimit
}

export function formatSeatLimit(planId) {
  const limit = seatLimitFor(planId)
  return Number.isFinite(limit) ? String(limit) : 'Unlimited'
}

export function isOverSeatLimit(planId, employeeCount) {
  return employeeCount > seatLimitFor(planId)
}

async function authedPost(path, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.error || 'Billing request failed.')
  return payload
}

/** Opens the Stripe Customer Portal for the caller's organization. */
export async function createPortalSession(orgId) {
  const { url } = await authedPost('/api/create-portal-session', {
    orgId,
    returnUrl: `${window.location.origin}/billing`,
  })
  if (!url) throw new Error('Stripe did not return a portal URL.')
  return url
}

/** Starts a Checkout session for orgs with no subscription yet. */
export async function createCheckoutSession(orgId, planId) {
  const plan = getPlan(planId)
  const { url } = await authedPost('/api/create-checkout-session', {
    orgId,
    priceId: plan.priceId,
    successUrl: `${window.location.origin}/billing?checkout=success`,
    cancelUrl: `${window.location.origin}/billing?checkout=cancelled`,
  })
  if (!url) throw new Error('Stripe did not return a checkout URL.')
  return url
}

export function formatCurrency(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '$0.00'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
