"use client";

import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface CastSectionProps {
  cast: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
  }> | undefined;
  isLoading?: boolean;
}

export default function CastSection({ cast, isLoading }: CastSectionProps) {
  if (isLoading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">Cast & Crew</h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-32 text-center">
              <Skeleton className="w-32 h-32 rounded-full mb-3" />
              <Skeleton className="h-4 w-24 mx-auto mb-2" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!cast || cast.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">Cast & Crew</h2>
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 4,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 2 },
              "(max-width: 1024px)": { slidesToScroll: 3 },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4 gap-4">
            {cast.map((person) => (
              <CarouselItem key={person.id} className="pl-2 md:pl-4 basis-[140px] sm:basis-[160px]">
                <div className="text-center group cursor-pointer">
                  <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                    {person.profile_path ? (
                      <Image
                        src={getPosterUrl(person.profile_path, "w300")}
                        alt={person.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {person.name[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm line-clamp-1">{person.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{person.character}</p>
                </div>
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

