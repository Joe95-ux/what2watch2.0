"use client";

import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";

interface MoreLikeThisSectionProps {
  items: (TMDBMovie | TMDBSeries)[];
  type: "movie" | "tv";
  isLoading?: boolean;
}

export default function MoreLikeThisSection({ items, isLoading, type }: MoreLikeThisSectionProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">More Like This</h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="flex-shrink-0 w-48 aspect-[2/3] rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">More Like This</h2>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
        {items.map((item) => {
          const title = type === "movie" ? (item as TMDBMovie).title : (item as TMDBSeries).name;
          const posterPath = item.poster_path;

          return (
            <div
              key={item.id}
              className="flex-shrink-0 w-48 cursor-pointer group"
              onClick={() => router.push(`/${type}/${item.id}`)}
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-3 bg-muted group-hover:scale-105 transition-transform">
                {posterPath ? (
                  <Image
                    src={getPosterUrl(posterPath, "w500")}
                    alt={title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">No Image</span>
                  </div>
                )}
              </div>
              <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {title}
              </p>
              {item.vote_average > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  ⭐ {item.vote_average.toFixed(1)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

