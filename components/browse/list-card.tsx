"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { List } from "@/hooks/use-lists";
import { getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle } from "lucide-react";

interface ListCardProps {
  list: List;
  className?: string;
  variant?: "carousel" | "grid";
}

export default function ListCard({ list, className, variant = "carousel" }: ListCardProps) {
  const router = useRouter();

  const getListPosters = () => {
    if (list.items && list.items.length > 0) {
      // Get first 5 items with posters
      return list.items
        .filter(item => item.posterPath)
        .slice(0, 5)
        .map(item => getPosterUrl(item.posterPath!, "w500"));
    }
    return [];
  };

  const posters = getListPosters();
  const hasStackedPosters = posters.length > 1;
  const itemCount = list._count?.items || list.items?.length || 0;
  const displayName = list.user?.displayName || list.user?.username || "Unknown";
  const likeCount = list._count?.likedBy || 0;
  const commentCount = list._count?.comments || 0;

  return (
    <div
      className={cn(
        "group relative cursor-pointer",
        variant === "carousel" && "flex-shrink-0 w-[180px] sm:w-[200px]",
        variant === "grid" && "w-full",
        className
      )}
      onClick={() => router.push(`/lists/${list.id}`)}
    >
      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors">
        {/* Stacked Posters - Letterboxd style like YouTube channel avatars */}
        {hasStackedPosters ? (
          <div className="relative w-full h-full">
            {posters.map((poster, index) => {
              // Stack posters with negative margin like YouTube channel avatars
              // First poster (index 0) has no offset, each subsequent poster overlaps
              const offsetX = index * 4; // Horizontal offset (slightly more than avatars for rectangular posters)
              const offsetY = index * 4; // Vertical offset
              const zIndex = posters.length - index; // First poster on top
              
              return (
                <div
                  key={index}
                  className={cn(
                    "absolute inset-0 rounded-lg overflow-hidden border-2 border-background",
                    index > 0 && "shadow-lg"
                  )}
                  style={{
                    transform: `translate(${offsetX}px, ${offsetY}px)`,
                    zIndex,
                  }}
                >
                  <Image
                    src={poster}
                    alt={`${list.name} - Film ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 180px, 200px"
                  />
                </div>
              );
            })}
            {/* Blur effect to indicate more films */}
            {list.items.length > posters.length && (
              <div
                className={cn(
                  "absolute inset-0 rounded-lg overflow-hidden border-2 border-background bg-muted/60 backdrop-blur-md flex items-center justify-center",
                  "shadow-lg"
                )}
                style={{
                  transform: `translate(${posters.length * 4}px, ${posters.length * 4}px)`,
                  zIndex: 0,
                }}
              >
                <span className="text-xs font-semibold text-muted-foreground">
                  +{list.items.length - posters.length}
                </span>
              </div>
            )}
          </div>
        ) : posters.length === 1 ? (
          <Image
            src={posters[0]}
            alt={list.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 180px, 200px"
          />
        ) : list.coverImage ? (
          <Image
            src={list.coverImage}
            alt={list.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 180px, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-muted-foreground text-sm text-center px-2">No Cover</span>
          </div>
        )}

        {/* Tags - Bottom Left (if any) */}
        {list.tags && list.tags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 max-w-[70%] opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {list.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white rounded"
              >
                {tag}
              </span>
            ))}
            {list.tags.length > 2 && (
              <span className="text-xs px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white rounded">
                +{list.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Title and Meta Info Below Card - Always visible like dashboard lists */}
      <div className="mt-2">
        <h3 className="text-[16px] font-semibold line-clamp-1 mb-1">{list.name}</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{displayName}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {likeCount}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {commentCount}
          </span>
        </div>
      </div>
    </div>
  );
}

