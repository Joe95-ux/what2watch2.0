import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface YouTubeProfileSkeletonProps {
  variant?: "compact" | "grid";
  count?: number;
  className?: string;
}

/**
 * Skeleton component for YouTube profiles
 * - compact: Small profile buttons (used in quick filters)
 * - grid: Grid/carousel items (used in browse and nollywood pages)
 */
export function YouTubeProfileSkeleton({ 
  variant = "compact", 
  count = 2,
  className 
}: YouTubeProfileSkeletonProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2 flex-shrink-0", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 flex-shrink-0">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    );
  }

  // Grid variant
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-3">
          <Skeleton className="w-32 h-32 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

