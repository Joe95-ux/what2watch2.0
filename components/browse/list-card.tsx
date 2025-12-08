"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { List } from "@/hooks/use-lists";
import { getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, List as ListIcon } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface ListCardProps {
  list: List;
  className?: string;
  variant?: "carousel" | "grid";
}

export default function ListCard({ list, className, variant = "carousel" }: ListCardProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const isOwner = currentUser?.id === list.userId;

  const getListPosters = () => {
    if (list.items && list.items.length > 0) {
      // Get first 3 items with posters
      return list.items
        .filter(item => item.posterPath)
        .slice(0, 3)
        .map(item => getPosterUrl(item.posterPath!, "w500")); // Use w500 for better quality (poster size)
    }
    return [];
  };

  const posters = getListPosters();
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
      onClick={() => router.push(isOwner ? `/dashboard/lists/${list.id}` : `/lists/${list.id}`)}
    >
      <div className="relative w-full h-[225px] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors">
        {/* Grid of 3 Posters */}
        {posters.length > 0 ? (
          <div className="relative w-full h-[225px] grid grid-cols-3 gap-1">
            {posters.map((poster, index) => {
              // Border radius: first (left), middle (none), third (right)
              const borderRadiusClass = 
                index === 0 ? "rounded-tl-lg rounded-bl-lg" :
                index === 2 ? "rounded-tr-lg rounded-br-lg" :
                "";
              
              return (
                <div
                  key={index}
                  className={`relative w-full h-full overflow-hidden bg-muted ${borderRadiusClass}`}
                >
                  <Image
                    src={poster}
                    alt={`${list.name} - Film ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 120px, (max-width: 1024px) 150px, 200px"
                    quality={90}
                  />
                </div>
              );
            })}
            {/* Fill remaining slots if less than 3 posters */}
            {posters.length < 3 && Array.from({ length: 3 - posters.length }).map((_, index) => {
              const actualIndex = posters.length + index;
              const borderRadiusClass = 
                actualIndex === 0 ? "rounded-tl-lg rounded-bl-lg" :
                actualIndex === 2 ? "rounded-tr-lg rounded-br-lg" :
                "";
              
              return (
                <div
                  key={`empty-${index}`}
                  className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center ${borderRadiusClass}`}
                >
                  <span className="text-muted-foreground text-xs">No Cover</span>
                </div>
              );
            })}
          </div>
        ) : list.coverImage ? (
          <div className="relative w-full h-[225px]">
            <Image
              src={list.coverImage}
              alt={list.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110 rounded-lg"
              sizes="(max-width: 640px) 180px, 200px"
              quality={90}
            />
          </div>
        ) : (
          <div className="w-full h-[225px] flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 rounded-lg">
            <span className="text-muted-foreground text-sm text-center px-2">No Cover</span>
          </div>
        )}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-lg" />

        {/* List Icon and Text - Bottom Left */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
          <ListIcon className="h-6 w-6 text-white" />
          <span className="text-sm font-medium text-white">List</span>
        </div>
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

