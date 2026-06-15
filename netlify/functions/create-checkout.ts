/**
 * create-checkout
 * Creates a Stripe Checkout session and returns the redirect URL.
 * Called by Signup.tsx after account creation.
 */

import type { Handler, HandlerEvent } from '@netlify/functions'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-04-10',
})

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER ?? '',
  pro: process.env.STRIPE_PRICE_ID_PRO ?? '',
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const body = JSON.parse(event.body ?? '{}') as { uid: string; email: string; plan: string }
  const { uid, email, plan } = body

  if (!uid || !email || !plan) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing uid, email, or plan' }) }
  }

  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return { statusCode: 400, body: JSON.stringify({ error: `Unknown plan: ${plan}` }) }
  }

  const appUrl = process.env.APP_URL ?? 'https://permitwatch.nyc'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { firebaseUid: uid },
      },
      metadata: { firebaseUid: uid },
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    }
  } catch (err) {
    console.error('Stripe error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'Stripe error' }),
    }
  }
}
