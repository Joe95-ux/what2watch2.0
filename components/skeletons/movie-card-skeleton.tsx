import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MovieCardSkeletonProps {
  className?: string;
}

export function MovieCardSkeleton({ className }: MovieCardSkeletonProps) {
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div className="relative block aspect-[2/3] rounded-lg overflow-hidden border border-border/50 shadow-sm bg-muted">
        {/* Poster area */}
        <Skeleton className="w-full h-full rounded-lg" />

        {/* Dark gradient overlay (matches MovieCard's hover overlay look) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Faux overlay content: rating row + title lines */}
        <div className="absolute inset-0 p-3 flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-4 w-1.5 rounded-full bg-foreground/30" />
            <Skeleton className="h-4 w-8 rounded" />
          </div>
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="mt-2 h-3 w-2/3 rounded bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}

