import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createOrRetrieveCustomer } from '@/lib/stripe/adminTasks';
import db from '@/lib/supabase/db';

export async function POST(request: NextRequest) {
  try {
    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has an active subscription
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.userId, user.id),
    });

    // Get or create customer
    const customerId = await createOrRetrieveCustomer({
      email: user.email || '',
      uuid: user.id || '',
    });

    if (!customerId) {
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      );
    }

    // If subscription exists and is active, update it
    if (existingSubscription?.id && existingSubscription.status === 'active') {
      const currentSubscription = await stripe.subscriptions.retrieve(
        existingSubscription.id
      );

      const subscription = await stripe.subscriptions.update(
        existingSubscription.id,
        {
          items: [
            {
              id: currentSubscription.items.data[0].id,
              deleted: true,
            },
            {
              price: priceId,
            },
          ],
          expand: ['latest_invoice.confirmation_secret'],
        }
      );

      return NextResponse.json({
        subscriptionId: subscription.id,
        // @ts-ignore - Extract client_secret from confirmation_secret
        clientSecret: subscription.latest_invoice?.confirmation_secret?.client_secret,
      });
    }

    // Create new subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.confirmation_secret'],
    });

    console.log('[CREATE_SUBSCRIPTION] Subscription created:', {
      id: subscription.id,
      status: subscription.status,
    });

    // @ts-ignore - Extract client_secret from confirmation_secret
    const clientSecret = subscription.latest_invoice?.confirmation_secret?.client_secret;

    console.log('[CREATE_SUBSCRIPTION] Client secret:', clientSecret ? 'Found' : 'MISSING');

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
    });
  } catch (error: any) {
    console.error('[CREATE_SUBSCRIPTION]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
