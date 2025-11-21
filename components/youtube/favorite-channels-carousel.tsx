"use client";

import { useFavoriteChannels } from "@/hooks/use-favorite-channels";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Youtube } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { YouTubeProfileSkeleton } from "@/components/browse/youtube-profile-skeleton";

export default function FavoriteChannelsCarousel() {
  const { data: favorites = [], isLoading } = useFavoriteChannels();
  const router = useRouter();

  if (isLoading) {
    return <YouTubeProfileSkeleton variant="grid" count={6} />;
  }

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="relative group/carousel mb-8">
      <h2 className="text-2xl font-medium text-foreground mb-6 px-4 sm:px-6 lg:px-8">
        Favorite Channels
      </h2>
      <Carousel
        opts={{
          align: "start",
          slidesToScroll: 4,
          breakpoints: {
            "(max-width: 640px)": { slidesToScroll: 2 },
            "(max-width: 1024px)": { slidesToScroll: 3 },
            "(max-width: 1280px)": { slidesToScroll: 4 },
          },
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4 gap-4 px-4 sm:px-6 lg:px-8">
          {favorites.map((favorite) => (
            <CarouselItem
              key={favorite.id}
              className="pl-2 md:pl-4 basis-[140px] sm:basis-[160px]"
            >
              <button
                onClick={() => router.push(`/youtube-channel/${favorite.channelId}`)}
                className="group block text-center cursor-pointer w-full"
              >
                <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                  {favorite.thumbnail ? (
                    <Image
                      src={favorite.thumbnail}
                      alt={favorite.title || "Channel"}
                      fill
                      className="object-cover"
                      sizes="128px"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 bg-muted flex items-center justify-center">
                      <Youtube className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {favorite.title || "Channel"}
                </p>
              </button>
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
  );
}

