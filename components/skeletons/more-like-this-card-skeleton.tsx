import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MoreLikeThisCardSkeletonProps {
  className?: string;
}

export function MoreLikeThisCardSkeleton({ className }: MoreLikeThisCardSkeletonProps) {
  return (
    <div className={cn("relative bg-card rounded-lg overflow-hidden", className)}>
      {/* Section 1: Movie Poster - Square aspect ratio */}
      <div className="relative aspect-square bg-muted overflow-hidden border-b border-border/50">
        <Skeleton className="w-full h-full" />
      </div>
      {/* Section 2: Metadata and Title */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-3 w-1 rounded-full" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
    </div>
  );
}

