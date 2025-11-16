"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { List } from "@/hooks/use-lists";
import { getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

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
  const hasDeckEffect = posters.length > 1;
  const itemCount = list._count?.items || list.items?.length || 0;
  const displayName = list.user?.displayName || list.user?.username || "Unknown";

  return (
    <div
      className={cn(
        "group relative cursor-pointer",
        "transition-transform duration-300 hover:scale-105",
        variant === "carousel" && "flex-shrink-0 w-[180px] sm:w-[200px]",
        variant === "grid" && "w-full",
        className
      )}
      onClick={() => router.push(`/lists/${list.id}`)}
    >
      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors">
        {/* Deck of Cards Effect - Stacked like Letterboxd */}
        {hasDeckEffect ? (
          <div className="relative w-full h-full">
            {posters.map((poster, index) => {
              // Each card is slightly offset to reveal the one below
              // Top card (index 0) has no offset, each subsequent card is offset by 3px
              const offsetX = index * 3; // Horizontal offset
              const offsetY = index * 3; // Vertical offset
              const zIndex = posters.length - index; // First poster on top
              
              return (
                <div
                  key={index}
                  className="absolute inset-0"
                  style={{
                    transform: `translate(${offsetX}px, ${offsetY}px)`,
                    zIndex,
                  }}
                >
                  <Image
                    src={poster}
                    alt={`${list.name} - Film ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                    sizes="(max-width: 640px) 180px, 200px"
                  />
                </div>
              );
            })}
          </div>
        ) : posters.length === 1 ? (
          <Image
            src={posters[0]}
            alt={list.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 180px, 200px"
          />
        ) : list.coverImage ? (
          <Image
            src={list.coverImage}
            alt={list.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 180px, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-muted-foreground text-sm text-center px-2">No Cover</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* List Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <h3 className="font-semibold text-white text-sm mb-1 line-clamp-1 drop-shadow-lg">
            {list.name}
          </h3>
          <p className="text-xs text-white/90 drop-shadow">
            {itemCount} {itemCount === 1 ? "film" : "films"}
          </p>
          {list.user && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/users/${list.user?.id}`);
              }}
              className="text-xs text-white/80 mt-1 drop-shadow hover:text-white transition-colors cursor-pointer"
            >
              by {displayName}
            </button>
          )}
        </div>

        {/* Badge - Position indicator for ranked lists */}
        {list.items && list.items.length > 0 && (
          <div className="absolute top-2 left-2 z-10">
            <div className="bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
              #{1}
            </div>
          </div>
        )}

        {/* Visibility Badge */}
        <div className="absolute top-2 right-2 z-10">
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded backdrop-blur-sm",
            list.visibility === "PUBLIC" && "bg-green-500/80 text-white",
            list.visibility === "FOLLOWERS_ONLY" && "bg-blue-500/80 text-white",
            list.visibility === "PRIVATE" && "bg-gray-500/80 text-white"
          )}>
            {list.visibility === "PUBLIC" ? "Public" : list.visibility === "FOLLOWERS_ONLY" ? "Followers" : "Private"}
          </div>
        </div>
      </div>

      {/* List Title - Always visible */}
      <div className="mt-2">
        <h3 className="font-medium text-sm line-clamp-1">{list.name}</h3>
        {list.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {list.description}
          </p>
        )}
        {list.tags && list.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {list.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
            {list.tags.length > 2 && (
              <span className="text-xs text-muted-foreground">+{list.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

