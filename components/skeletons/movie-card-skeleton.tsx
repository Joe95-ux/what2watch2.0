import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MovieCardSkeletonProps {
  className?: string;
}

export function MovieCardSkeleton({ className }: MovieCardSkeletonProps) {
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div className="relative block aspect-[2/3] rounded-lg overflow-hidden border border-border/50 shadow-sm bg-muted">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    </div>
  );
}

