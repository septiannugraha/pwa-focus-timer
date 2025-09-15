import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe only if configured
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

// Initialize Supabase only if configured
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )
  : null;

// Stripe webhook handler for subscription events
export async function POST(request: NextRequest) {
  // Return early if Stripe or Supabase not configured
  if (!stripe || !supabase) {
    return NextResponse.json(
      { error: 'Stripe or Supabase not configured' },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancellation(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSuccess(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailure(invoice);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  if (!supabase) {
    console.log('Supabase not configured - skipping subscription update');
    return;
  }

  const customerId = subscription.customer as string;
  const status = subscription.status;
  const tier = getTierFromPriceId(subscription.items.data[0].price.id);

  // Get user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // Update or create subscription record
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: user.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: status,
      tier: tier,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  // Update user's subscription status
  await supabase
    .from('users')
    .update({
      subscription_status: status,
      subscription_tier: tier,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  // Log subscription event
  await supabase
    .from('subscription_events')
    .insert({
      user_id: user.id,
      event_type: 'subscription_updated',
      details: {
        status,
        tier,
        subscription_id: subscription.id
      }
    });
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  if (!supabase) {
    console.log('Supabase not configured - skipping subscription cancellation');
    return;
  }

  const customerId = subscription.customer as string;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  // Update subscription to canceled
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  // Update user to free tier
  await supabase
    .from('users')
    .update({
      subscription_status: 'canceled',
      subscription_tier: 'free'
    })
    .eq('id', user.id);

  // Send cancellation email (implement email service)
  // await sendCancellationEmail(user.id);
}

async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  if (!supabase) {
    console.log('Supabase not configured - skipping payment success');
    return;
  }

  const customerId = invoice.customer as string;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  // Log successful payment
  await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      paid_at: new Date().toISOString()
    });

  // Reset any payment failure flags
  await supabase
    .from('users')
    .update({
      payment_failed: false,
      payment_failed_at: null
    })
    .eq('id', user.id);
}

async function handlePaymentFailure(invoice: Stripe.Invoice) {
  if (!supabase) {
    console.log('Supabase not configured - skipping payment failure');
    return;
  }

  const customerId = invoice.customer as string;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  // Log failed payment
  await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      failed_at: new Date().toISOString()
    });

  // Set payment failure flag (for grace period)
  await supabase
    .from('users')
    .update({
      payment_failed: true,
      payment_failed_at: new Date().toISOString()
    })
    .eq('id', user.id);

  // Send payment failure email
  // await sendPaymentFailureEmail(user.id);
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  if (!supabase) {
    console.log('Supabase not configured - skipping checkout complete');
    return;
  }

  const customerId = session.customer as string;
  const userId = session.client_reference_id;

  if (!userId) return;

  // Link Stripe customer to user
  await supabase
    .from('users')
    .update({
      stripe_customer_id: customerId
    })
    .eq('id', userId);
}

function getTierFromPriceId(priceId: string): string {
  const priceTiers: Record<string, string> = {};

  if (process.env.STRIPE_PRICE_BASIC) {
    priceTiers[process.env.STRIPE_PRICE_BASIC] = 'basic';
  }
  if (process.env.STRIPE_PRICE_PRO) {
    priceTiers[process.env.STRIPE_PRICE_PRO] = 'pro';
  }
  if (process.env.STRIPE_PRICE_PREMIUM) {
    priceTiers[process.env.STRIPE_PRICE_PREMIUM] = 'premium';
  }

  return priceTiers[priceId] || 'free';
}