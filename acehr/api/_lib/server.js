import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

/** Stripe client built from the server-only secret key. */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.')
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

/** Supabase admin client. Bypasses RLS -- server use only. */
export function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service credentials are not configured.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/**
 * Verifies the caller's Supabase JWT and returns their users row. Every
 * tenant-scoped endpoint derives org_id from this, never from the request body.
 */
export async function requireUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    const err = new Error('Missing bearer token.')
    err.status = 401
    throw err
  }

  const admin = getAdminClient()
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData?.user) {
    const err = new Error('Invalid or expired session.')
    err.status = 401
    throw err
  }

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id, org_id, role, full_name, email')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    const err = new Error('No agency profile for this account.')
    err.status = 403
    throw err
  }

  return { admin, authUser: authData.user, profile }
}

/** Rejects callers whose org differs from the one named in the request. */
export function assertSameOrg(profile, orgId) {
  if (!orgId || profile.org_id !== orgId) {
    const err = new Error('You do not have access to that organization.')
    err.status = 403
    throw err
  }
}

export function assertAdmin(profile) {
  if (profile.role !== 'admin') {
    const err = new Error('Admin role required.')
    err.status = 403
    throw err
  }
}

export function methodGuard(req, res, method) {
  if (req.method !== method) {
    res.setHeader('Allow', method)
    res.status(405).json({ error: `Method ${req.method} not allowed.` })
    return false
  }
  return true
}

export function fail(res, error) {
  const status = error?.status ?? 500
  if (status >= 500) console.error(error)
  res.status(status).json({ error: error?.message ?? 'Unexpected server error.' })
}

/** Maps a Stripe price ID back onto an AceHR plan tier. */
export function planForPriceId(priceId) {
  const map = {
    [process.env.VITE_STRIPE_PRICE_STARTER]: 'starter',
    [process.env.VITE_STRIPE_PRICE_GROWTH]: 'growth',
    [process.env.VITE_STRIPE_PRICE_ENTERPRISE]: 'enterprise',
  }
  return map[priceId] ?? null
}
