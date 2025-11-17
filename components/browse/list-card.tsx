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
        variant === "carousel" && "flex-shrink-0 w-[180px] sm:w-[200px]",
        variant === "grid" && "w-full",
        className
      )}
      onClick={() => router.push(`/lists/${list.id}`)}
    >
      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors">
        {/* Deck of Cards Effect - Stacked like Letterboxd */}
        {hasDeckEffect ? (
          <div className="relative w-full h-full overflow-hidden">
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
                    className="object-cover rounded-lg transition-transform duration-500 group-hover:scale-110"
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

        {/* Item Count Badge - Same as playlist card */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
          <span className="text-xs font-medium text-white">
            {itemCount}
          </span>
        </div>
      </div>

      {/* Title below card (visible on mobile, hidden on desktop where overlay shows) - Same as playlist card */}
      <div className="mt-2 md:hidden">
        <h3 className="font-semibold text-sm line-clamp-1">{list.name}</h3>
        <p className="text-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? "film" : "films"}
          {list.user && (
            <>
              {" • "}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/users/${list.user?.id}`);
                }}
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                by {displayName}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

