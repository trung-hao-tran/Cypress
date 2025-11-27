import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import db, { schema } from '@/lib/supabase/db';
import { eq } from 'drizzle-orm';

const { subscriptions } = schema;

export async function POST(request: NextRequest) {
  try {
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

    // Get user's subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.userId, user.id),
    });

    if (!subscription || !subscription.id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Cancel the subscription at period end
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        cancel_at_period_end: true,
      }
    );

    console.log('[CANCEL_SUBSCRIPTION] Subscription canceled:', canceledSubscription.id);

    // Update database immediately so UI reflects the change
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
      })
      .where(eq(subscriptions.id, subscription.id));

    return NextResponse.json({
      success: true,
      cancelsAt: canceledSubscription.cancel_at,
    });
  } catch (error: any) {
    console.error('[CANCEL_SUBSCRIPTION]', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription', details: error.message },
      { status: 500 }
    );
  }
}
