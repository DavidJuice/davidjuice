import {
  assertAdmin,
  assertSameOrg,
  fail,
  getStripe,
  methodGuard,
  requireUser,
} from './_lib/server.js'

/** Returns a Stripe Customer Portal URL for the caller's organization. */
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return

  try {
    const { admin, profile } = await requireUser(req)
    const { orgId, returnUrl } = req.body ?? {}
    assertSameOrg(profile, orgId)
    assertAdmin(profile)

    const { data: org, error } = await admin
      .from('organizations')
      .select('id, stripe_customer_id')
      .eq('id', orgId)
      .single()
    if (error) throw new Error(error.message)

    if (!org.stripe_customer_id) {
      const err = new Error('No Stripe customer for this agency yet. Start a subscription first.')
      err.status = 400
      throw err
    }

    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl || `${process.env.VITE_APP_URL || ''}/billing`,
    })

    res.status(200).json({ url: session.url })
  } catch (error) {
    fail(res, error)
  }
}
