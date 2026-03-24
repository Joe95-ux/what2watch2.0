import type Stripe from "stripe";
import { db } from "@/lib/db";

/**
 * Syncs Stripe Subscription to our User. Used by webhooks and checkout completion.
 */
export async function syncSubscriptionToUser(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  let user =
    sub.metadata?.userId != null && sub.metadata.userId !== ""
      ? await db.user.findUnique({ where: { id: sub.metadata.userId } })
      : null;

  if (!user) {
    user = await db.user.findFirst({
      where: { stripeCustomerId: customerId },
    });
  }

  if (!user) {
    console.error("[Stripe] syncSubscriptionToUser: no user for subscription", sub.id, customerId);
    return;
  }

  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000)
    : null;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null;

  await db.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripeSubscriptionStatus: sub.status,
      stripeSubscriptionCurrentPeriodStart: periodStart,
      stripeSubscriptionCurrentPeriodEnd: periodEnd,
    },
  });
}
