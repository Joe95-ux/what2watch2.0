"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function MemberCardCompactSkeleton() {
  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        "bg-sky-50/90 dark:bg-zinc-900/80"
      )}
    >
      {/* Banner */}
      <Skeleton className="h-20 w-full rounded-none" />
      {/* Avatar + follow area */}
      <div className="px-4 pt-4 pb-3 flex items-end justify-between">
        <Skeleton className="h-14 w-14 rounded-full shrink-0" />
        <Skeleton className="h-8 w-20 rounded-[20px]" />
      </div>
      {/* Name row */}
      <div className="px-4 pb-3 flex justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-28 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      </div>
      {/* Stats wrapper */}
      <div className="px-4 pb-4">
        <div className="rounded-[15px] border border-border/60 bg-muted/20 px-3 py-2.5 flex items-center justify-around gap-1">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-6" />
        </div>
        <Skeleton className="mt-3 h-9 w-full rounded-[20px]" />
      </div>
    </div>
  );
}

export function MemberCardListSkeleton() {
  return (
    <div
      className={cn(
        "border rounded-xl p-4",
        "bg-sky-50/90 dark:bg-zinc-900/80"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-10 w-full mb-3 rounded-lg" />
      <div className="flex items-center gap-4 mb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 flex-1 rounded-[20px]" />
        <Skeleton className="h-9 w-20 rounded-[20px]" />
      </div>
    </div>
  );
}
