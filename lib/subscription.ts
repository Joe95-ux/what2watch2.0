import { DEFAULT_FREE_CHAT_LIMIT } from "@/lib/billing";

/** Stripe subscription statuses that grant Pro access (unlimited AI chat). */
export function hasActiveProSubscription(stripeSubscriptionStatus: string | null | undefined): boolean {
  const s = stripeSubscriptionStatus;
  return s === "active" || s === "trialing";
}

/** Stripe subscription needs payment attention (show banner). */
export function subscriptionNeedsPaymentAction(stripeSubscriptionStatus: string | null | undefined): boolean {
  const s = stripeSubscriptionStatus;
  return s === "past_due" || s === "unpaid";
}

/**
 * Resolves max AI chat questions (same rules as movie-details API).
 * Stripe Pro wins; then admin `chatQuota === -1`; then custom or default free limit.
 */
export function resolveMaxChatQuestions(
  chatQuota: number | null,
  stripeSubscriptionStatus: string | null,
): number {
  if (hasActiveProSubscription(stripeSubscriptionStatus)) {
    return -1;
  }
  if (chatQuota === -1) return -1;
  if (chatQuota === null) return DEFAULT_FREE_CHAT_LIMIT;
  return chatQuota;
}
