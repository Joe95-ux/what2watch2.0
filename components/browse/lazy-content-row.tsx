"use client";

import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import ContentRow from "./content-row";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

interface LazyContentRowProps {
  title: string;
  items: (TMDBMovie | TMDBSeries)[];
  type: "movie" | "tv";
  isLoading?: boolean;
  href?: string;
}

/**
 * ContentRow wrapper that only renders when it enters the viewport
 * This optimizes initial page load by deferring below-fold content
 */
export default function LazyContentRow({
  title,
  items,
  type,
  isLoading,
  href,
}: LazyContentRowProps) {
  const [ref, isIntersecting] = useIntersectionObserver();

  // Show skeleton placeholder before intersection
  if (!isIntersecting) {
    return (
      <div ref={ref} className="mb-12">
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[180px] sm:w-[200px] aspect-[2/3] bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render actual content once in viewport
  return (
    <div ref={ref}>
      <ContentRow title={title} items={items} type={type} isLoading={isLoading} href={href} />
    </div>
  );
}

