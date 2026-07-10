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
