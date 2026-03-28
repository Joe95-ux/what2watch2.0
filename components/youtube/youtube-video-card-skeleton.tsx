import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type YouTubeVideoCardSkeletonProps = {
  /** Match YouTubeVideoCard title clamp (recommendations use 1 line). */
  titleLines?: 1 | 2;
  className?: string;
};

/**
 * Mirrors YouTubeVideoCard layout: thumbnail + duration pill, meta row (published + action),
 * title, channel — so loading states read as real cards, not generic blocks.
 */
export function YouTubeVideoCardSkeleton({
  titleLines = 2,
  className,
}: YouTubeVideoCardSkeletonProps) {
  return (
    <div
      className={cn(
        "relative bg-card rounded-lg overflow-hidden",
        className
      )}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none bg-muted" />
        {/* Duration badge area (bottom-right, like real card) */}
        <div className="absolute bottom-2 right-2">
          <Skeleton className="h-5 w-11 rounded-md bg-background/40" />
        </div>
        {/* Top-right overlay hint (share / menu) */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-60">
          <Skeleton className="h-8 w-8 rounded-full bg-background/30" />
          <Skeleton className="h-8 w-8 rounded-full bg-background/30" />
        </div>
      </div>

      <div className="bg-muted/60 dark:bg-card p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
        </div>
        <div className="space-y-1.5">
          <Skeleton
            className={cn("h-4 w-full", titleLines === 1 ? "max-w-[92%]" : "max-w-[95%]")}
          />
          {titleLines === 2 && (
            <Skeleton className="h-4 w-[72%] max-w-[240px]" />
          )}
        </div>
        <Skeleton className="h-3.5 w-3/5 max-w-[180px]" />
      </div>
    </div>
  );
}
