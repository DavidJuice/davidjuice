import { supabase, errorMessage } from './supabase.js'

/** Slugify an agency name into a URL-safe org slug. */
export function slugify(name) {
  const base = String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'agency'
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(errorMessage(error))
  return data.session
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(errorMessage(error, 'Invalid email or password.'))
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(errorMessage(error))
}

/**
 * Signs up the first admin of a new agency:
 *   auth user -> organization -> users row (role=admin) -> employee record.
 * Stripe customer creation is delegated to /api/create-customer, which holds
 * the secret key. A Stripe failure never blocks account creation.
 */
export async function signUpAgency({ fullName, email, password, agencyName }) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, agency_name: agencyName } },
  })
  if (authError) throw new Error(errorMessage(authError))

  const userId = authData.user?.id
  if (!userId) throw new Error('Signup failed: no user returned.')

  // Projects with email confirmation on return no session; the org is then
  // provisioned on first login instead (AuthContext calls provisionOrg).
  if (!authData.session) return { needsConfirmation: true, userId }

  const org = await provisionOrg({ userId, fullName, email, agencyName })
  return { needsConfirmation: false, userId, org }
}

/**
 * Creates organization + users + employees rows for a freshly signed-up admin.
 * Idempotent: returns the existing org if the user already has one.
 */
export async function provisionOrg({ userId, fullName, email, agencyName }) {
  const { data: existing } = await supabase
    .from('users')
    .select('org_id, organizations(*)')
    .eq('id', userId)
    .maybeSingle()
  if (existing?.organizations) return existing.organizations

  const slug = `${slugify(agencyName)}-${Math.random().toString(36).slice(2, 7)}`
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: agencyName, slug })
    .select()
    .single()
  if (orgError) throw new Error(errorMessage(orgError, 'Could not create the agency.'))

  const { error: userError } = await supabase
    .from('users')
    .insert({ id: userId, org_id: org.id, full_name: fullName, email, role: 'admin' })
  if (userError) throw new Error(errorMessage(userError, 'Could not create your profile.'))

  await supabase.from('employees').insert({
    org_id: org.id,
    user_id: userId,
    full_name: fullName,
    email,
    branch: 'HQ',
    position: 'Administrator',
    hire_date: new Date().toISOString().slice(0, 10),
  })

  await createStripeCustomer({ orgId: org.id, email, name: agencyName })
  return org
}

/** Server-side Stripe customer creation. Failures are non-fatal by design. */
async function createStripeCustomer({ orgId, email, name }) {
  try {
    const session = await getSession()
    await fetch('/api/create-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ orgId, email, name }),
    })
  } catch {
    // Billing can be attached later from /billing; account creation still stands.
  }
}
