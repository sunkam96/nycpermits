/**
 * stripe-webhook
 * Listens for Stripe events and syncs subscription state to Firestore.
 * Configure in Stripe Dashboard → Webhooks → your Netlify URL.
 */

import type { Handler, HandlerEvent } from '@netlify/functions'
import Stripe from 'stripe'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-04-10',
})

function getAdminDb() {
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })
  return getFirestore(app, 'permits')
}

export const handler: Handler = async (event: HandlerEvent) => {
  const sig = event.headers['stripe-signature']
  if (!sig) return { statusCode: 400, body: 'Missing stripe-signature' }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body ?? '',
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ''
    )
  } catch (err) {
    console.error('Webhook signature error:', err)
    return { statusCode: 400, body: 'Invalid signature' }
  }

  const db = getAdminDb()

  async function updateUserPlan(uid: string, update: Record<string, unknown>) {
    await db.collection('users').doc(uid).update(update)
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      const uid = session.metadata?.firebaseUid
      if (!uid) break
      await updateUserPlan(uid, {
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        plan: 'starter', // will be refined by subscription events
      })
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = stripeEvent.data.object as Stripe.Subscription
      const uid = sub.metadata?.firebaseUid
      if (!uid) break

      const priceId = sub.items.data[0]?.price.id
      const plan = priceId === process.env.STRIPE_PRICE_ID_PRO ? 'pro' : 'starter'
      const status = sub.status

      await updateUserPlan(uid, {
        plan: status === 'active' || status === 'trialing' ? plan : 'cancelled',
        stripeSubscriptionId: sub.id,
        stripeCustomerId: sub.customer,
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = stripeEvent.data.object as Stripe.Subscription
      const uid = sub.metadata?.firebaseUid
      if (!uid) break
      await updateUserPlan(uid, { plan: 'cancelled' })
      break
    }

    default:
      console.log(`Unhandled event: ${stripeEvent.type}`)
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
