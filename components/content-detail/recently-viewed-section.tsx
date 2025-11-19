"use client";

import { useRecentlyViewed, recentlyViewedToTMDBItem } from "@/hooks/use-recently-viewed";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";

interface RecentlyViewedSectionProps {
  currentItemId: number;
  currentType: "movie" | "tv";
}

export default function RecentlyViewedSection({ currentItemId, currentType }: RecentlyViewedSectionProps) {
  const { data: recentlyViewed = [], isLoading } = useRecentlyViewed();
  const router = useRouter();

  // Filter out current item and convert to TMDB format
  const items = recentlyViewed
    .filter((item) => !(item.tmdbId === currentItemId && item.mediaType === currentType))
    .map(recentlyViewedToTMDBItem)
    .slice(0, 20); // Limit to 20 items

  if (isLoading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">Recently Viewed</h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="flex-shrink-0 w-48 aspect-[2/3] rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">Recently Viewed</h2>
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 5,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 2 },
              "(max-width: 1024px)": { slidesToScroll: 3 },
              "(max-width: 1280px)": { slidesToScroll: 4 },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4 gap-3">
            {items.map((item) => {
              const itemType = "title" in item ? "movie" : "tv";
              return (
                <CarouselItem key={item.id} className="pl-2 md:pl-4 basis-[180px] sm:basis-[200px]">
                  <MoreLikeThisCard
                    item={item}
                    type={itemType}
                    onItemClick={(item, itemType) => {
                      router.push(`/${itemType}/${item.id}`);
                    }}
                  />
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious 
            className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
          <CarouselNext 
            className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
        </Carousel>
      </div>
    </section>
  );
}

