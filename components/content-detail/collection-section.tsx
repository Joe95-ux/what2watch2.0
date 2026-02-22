"use client";

import { TMDBMovie } from "@/lib/tmdb";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import { MoreLikeThisCardSkeleton } from "@/components/skeletons/more-like-this-card-skeleton";
import { createContentUrl } from "@/lib/content-slug";

interface CollectionSectionProps {
  collectionName: string;
  movies: TMDBMovie[];
  isLoading?: boolean;
  onClose: () => void;
}

export default function CollectionSection({ collectionName, movies, isLoading, onClose }: CollectionSectionProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{collectionName}</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <MoreLikeThisCardSkeleton key={i} className="flex-shrink-0 w-48" />
          ))}
        </div>
      </section>
    );
  }

  if (!movies || movies.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{collectionName}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full hover:bg-muted transition-colors duration-200 cursor-pointer"
          aria-label="Close collection section"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
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
          <CarouselContent className="-ml-2 md:-ml-4 gap-0">
            {movies.map((item) => (
              <CarouselItem key={item.id} className="pl-2 md:pl-4 basis-[180px] sm:basis-[200px]">
                <MoreLikeThisCard
                  item={item}
                  type="movie"
                  onItemClick={(item, itemType) => {
                    const title = "title" in item ? item.title : item.name;
                    router.push(createContentUrl(itemType, item.id, title));
                  }}
                />
              </CarouselItem>
            ))}
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
