import { DEFAULT_FREE_CHAT_LIMIT } from "@/lib/billing";

function getEditorialNotificationsEmailAllowlist() {
  const fromDedicatedVar = (process.env.EDITORIAL_NOTIFICATIONS_ALLOWLIST || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const fallbackSuperUser = (process.env.SUPER_USER || "")
    .trim()
    .toLowerCase();

  return new Set([
    ...fromDedicatedVar,
    ...(fallbackSuperUser ? [fallbackSuperUser] : []),
  ]);
}

/** Lowercased emails for DB `in` queries (server-only). */
export function getEditorialNotificationsAllowlistEmails(): string[] {
  return [...getEditorialNotificationsEmailAllowlist()];
}

/** Stripe subscription statuses that grant Pro access (unlimited AI chat). */
export function hasActiveProSubscription(stripeSubscriptionStatus: string | null | undefined): boolean {
  const s = stripeSubscriptionStatus;
  return s === "active" || s === "trialing";
}

export function hasEditorialNotificationsAccess(
  stripeSubscriptionStatus: string | null | undefined,
  email: string | null | undefined
): boolean {
  if (hasActiveProSubscription(stripeSubscriptionStatus)) return true;
  const allowlist = getEditorialNotificationsEmailAllowlist();
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  return allowlist.has(normalizedEmail);
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
