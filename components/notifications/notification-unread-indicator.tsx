import { cn } from "@/lib/utils";

/** Matches unread styling in the navbar notification dropdown. */
export function NotificationUnreadIndicator({ className }: { className?: string }) {
  return (
    <span
      className={cn("h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500", className)}
      aria-hidden
    />
  );
}

/**
 * Shared row chrome for notification lists.
 * Read rows stay plain. Unread rows keep a quiet emerald wash and a 2px edge
 * in the same color as the dot, so a stack of new items scans without a heavy stripe.
 * Both states reserve the left border so marking an item read does not shift the text.
 */
export function notificationItemClass(isRead: boolean, className?: string) {
  return cn(
    "border-l-2 transition-colors",
    isRead
      ? "border-l-transparent hover:bg-muted/50"
      : "border-l-emerald-500 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] dark:bg-emerald-400/10 dark:hover:bg-emerald-400/[0.16]",
    className
  );
}
