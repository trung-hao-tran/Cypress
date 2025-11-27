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
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Reactivate the subscription by removing cancel_at_period_end
    const reactivatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        cancel_at_period_end: false,
      }
    );

    console.log('[REACTIVATE_SUBSCRIPTION] Subscription reactivated:', reactivatedSubscription.id);

    // Update database immediately so UI reflects the change
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: false,
      })
      .where(eq(subscriptions.id, subscription.id));

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('[REACTIVATE_SUBSCRIPTION]', error);
    return NextResponse.json(
      { error: 'Failed to reactivate subscription', details: error.message },
      { status: 500 }
    );
  }
}
