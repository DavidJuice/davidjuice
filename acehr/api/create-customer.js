import { assertSameOrg, fail, getStripe, methodGuard, requireUser } from './_lib/server.js'

/**
 * Creates (or reuses) the Stripe customer for an organization and stores the
 * customer ID. Called once at signup; safe to call again.
 */
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return

  try {
    const { admin, profile } = await requireUser(req)
    const { orgId, email, name } = req.body ?? {}
    assertSameOrg(profile, orgId)

    const { data: org, error } = await admin
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', orgId)
      .single()
    if (error) throw new Error(error.message)

    if (org.stripe_customer_id) {
      res.status(200).json({ customerId: org.stripe_customer_id, created: false })
      return
    }

    const stripe = getStripe()
    const customer = await stripe.customers.create({
      email: email || profile.email || undefined,
      name: name || org.name,
      metadata: { org_id: org.id },
    })

    const { error: updateError } = await admin
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', org.id)
    if (updateError) throw new Error(updateError.message)

    res.status(200).json({ customerId: customer.id, created: true })
  } catch (error) {
    fail(res, error)
  }
}
