"use client";

import { useRecentlyViewed, useClearRecentlyViewed, recentlyViewedToTMDBItem } from "@/hooks/use-recently-viewed";
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
import { useMemo, useEffect, useState } from "react";
import type { CarouselApi } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface RecentlyViewedSectionProps {
  currentItemId: number;
  currentType: "movie" | "tv";
}

export default function RecentlyViewedSection({ currentItemId, currentType }: RecentlyViewedSectionProps) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useRecentlyViewed();
  const clearRecentlyViewed = useClearRecentlyViewed();
  const router = useRouter();
  const [api, setApi] = useState<CarouselApi>();
  const [isClearing, setIsClearing] = useState(false);

  // Flatten all pages into a single array and filter out current item
  const items = useMemo(() => {
    if (!data?.pages) return [];
    const allItems = data.pages.flatMap(page => page.items);
    return allItems
      .filter((item) => !(item.tmdbId === currentItemId && item.mediaType === currentType))
      .map(recentlyViewedToTMDBItem);
  }, [data, currentItemId, currentType]);

  // Detect scroll end and load more
  useEffect(() => {
    if (!api || !hasNextPage || isFetchingNextPage) return;

    const handleSelect = () => {
      const selectedIndex = api.selectedScrollSnap();
      const slidesCount = api.scrollSnapList().length;
      
      // If we're within 3 slides of the end, load more
      if (selectedIndex >= slidesCount - 3) {
        fetchNextPage();
      }
    };

    api.on("select", handleSelect);
    return () => {
      api.off("select", handleSelect);
    };
  }, [api, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await clearRecentlyViewed.mutateAsync();
    } catch (error) {
      console.error("Error clearing recently viewed:", error);
    } finally {
      setIsClearing(false);
    }
  };

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Recently Viewed</h2>
        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isClearing}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isClearing ? "Clearing..." : "Clear"}
          </Button>
        )}
      </div>
      <div className="relative group/carousel">
        <Carousel
          setApi={setApi}
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

