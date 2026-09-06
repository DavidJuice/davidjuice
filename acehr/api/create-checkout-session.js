import {
  assertAdmin,
  assertSameOrg,
  fail,
  getStripe,
  methodGuard,
  requireUser,
} from './_lib/server.js'

/** Starts a Stripe Checkout session for an org with no subscription yet. */
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return

  try {
    const { admin, profile } = await requireUser(req)
    const { orgId, priceId, successUrl, cancelUrl } = req.body ?? {}
    assertSameOrg(profile, orgId)
    assertAdmin(profile)

    if (!priceId) {
      const err = new Error('No Stripe price configured for that plan.')
      err.status = 400
      throw err
    }

    const { data: org, error } = await admin
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', orgId)
      .single()
    if (error) throw new Error(error.message)

    const stripe = getStripe()

    let customerId = org.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || undefined,
        name: org.name,
        metadata: { org_id: org.id },
      })
      customerId = customer.id
      await admin
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id)
    }

    const appUrl = process.env.VITE_APP_URL || ''
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: org.id,
      subscription_data: { metadata: { org_id: org.id } },
      success_url: successUrl || `${appUrl}/billing?checkout=success`,
      cancel_url: cancelUrl || `${appUrl}/billing?checkout=cancelled`,
    })

    res.status(200).json({ url: session.url })
  } catch (error) {
    fail(res, error)
  }
}
