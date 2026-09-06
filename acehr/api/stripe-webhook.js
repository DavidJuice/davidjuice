import { getAdminClient, getStripe, planForPriceId } from './_lib/server.js'

// Stripe signature verification needs the untouched request body.
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** Resolves the org for a subscription, by metadata first, then customer ID. */
async function findOrgId(admin, subscription) {
  const fromMetadata = subscription.metadata?.org_id
  if (fromMetadata) return fromMetadata

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  if (!customerId) return null

  const { data } = await admin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.id ?? null
}

/**
 * Stripe webhook. Keeps organizations.plan and stripe_subscription_id in sync
 * with the subscription lifecycle.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET is not configured.' })
    return
  }

  let event
  try {
    const stripe = getStripe()
    const rawBody = await readRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], secret)
  } catch (error) {
    console.error('Stripe signature verification failed:', error.message)
    res.status(400).json({ error: `Webhook signature verification failed: ${error.message}` })
    return
  }

  try {
    const admin = getAdminClient()

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const orgId = await findOrgId(admin, subscription)
        if (!orgId) break

        const priceId = subscription.items?.data?.[0]?.price?.id
        const plan = planForPriceId(priceId)
        const active = ['active', 'trialing', 'past_due'].includes(subscription.status)

        const patch = {
          stripe_subscription_id: active ? subscription.id : null,
        }
        // An unrecognised price leaves the tier untouched rather than guessing.
        if (plan && active) patch.plan = plan
        if (!active) patch.plan = 'starter'

        const { error } = await admin.from('organizations').update(patch).eq('id', orgId)
        if (error) throw new Error(error.message)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const orgId = await findOrgId(admin, subscription)
        if (!orgId) break

        const { error } = await admin
          .from('organizations')
          .update({ plan: 'starter', stripe_subscription_id: null })
          .eq('id', orgId)
        if (error) throw new Error(error.message)
        break
      }

      default:
        // Other events are acknowledged without action.
        break
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook handling failed:', error)
    res.status(500).json({ error: 'Webhook handling failed.' })
  }
}
