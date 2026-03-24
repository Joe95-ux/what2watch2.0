import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { hasActiveProSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
        stripeSubscriptionCurrentPeriodStart: true,
        stripeSubscriptionCurrentPeriodEnd: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const active = hasActiveProSubscription(user.stripeSubscriptionStatus);
    if (!active || !user.stripeCustomerId || !user.stripeSubscriptionId) {
      return NextResponse.json({
        billingCycle: {
          periodStart: user.stripeSubscriptionCurrentPeriodStart?.toISOString() ?? null,
          periodEnd: user.stripeSubscriptionCurrentPeriodEnd?.toISOString() ?? null,
          interval: null as string | null,
        },
        upcoming: null,
      });
    }

    const stripe = getStripe();

    let interval: string | null = null;
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const recurring = sub.items.data[0]?.price?.recurring;
      if (recurring?.interval) {
        const n = recurring.interval_count ?? 1;
        if (recurring.interval === "month") {
          interval = n === 1 ? "Monthly" : `Every ${n} months`;
        } else if (recurring.interval === "year") {
          interval = n === 1 ? "Yearly" : `Every ${n} years`;
        } else if (recurring.interval === "week") {
          interval = n === 1 ? "Weekly" : `Every ${n} weeks`;
        } else {
          interval = recurring.interval;
        }
      }
    } catch {
      // ignore
    }

    let upcoming: {
      amountDue: number;
      currency: string;
      nextPaymentAttempt: number | null;
      periodEnd: number | null;
    } | null = null;

    try {
      const inv = await stripe.invoices.retrieveUpcoming({
        customer: user.stripeCustomerId,
        subscription: user.stripeSubscriptionId,
      });
      upcoming = {
        amountDue: inv.amount_due,
        currency: inv.currency,
        nextPaymentAttempt: inv.next_payment_attempt,
        periodEnd: inv.period_end ?? null,
      };
    } catch {
      upcoming = null;
    }

    return NextResponse.json({
      billingCycle: {
        periodStart: user.stripeSubscriptionCurrentPeriodStart?.toISOString() ?? null,
        periodEnd: user.stripeSubscriptionCurrentPeriodEnd?.toISOString() ?? null,
        interval,
      },
      upcoming,
    });
  } catch (e) {
    console.error("[billing/summary]", e);
    return NextResponse.json({ error: "Failed to load billing summary" }, { status: 500 });
  }
}
