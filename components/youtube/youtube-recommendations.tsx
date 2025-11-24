"use client";

import { Sparkles } from "lucide-react";
import { useYouTubeRecommendations } from "@/hooks/use-youtube-recommendations";
import YouTubeVideoCard from "@/components/youtube/youtube-video-card";
import { YouTubeVideoCardSkeleton } from "@/components/youtube/youtube-video-card-skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function YouTubeRecommendations() {
  const { data, isLoading } = useYouTubeRecommendations();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Recommended for You</h2>
        </div>
        <div className="relative group/carousel">
          <Carousel
            opts={{
              align: "start",
              slidesToScroll: 1,
              dragFree: true,
              breakpoints: {
                "(max-width: 640px)": { slidesToScroll: 1, dragFree: true },
                "(min-width: 641px) and (max-width: 768px)": { slidesToScroll: 2, dragFree: true },
                "(min-width: 769px) and (max-width: 1024px)": { slidesToScroll: 3, dragFree: true },
                "(min-width: 1025px) and (max-width: 1280px)": { slidesToScroll: 4, dragFree: true },
                "(min-width: 1281px) and (max-width: 1536px)": { slidesToScroll: 5, dragFree: true },
                "(min-width: 1537px)": { slidesToScroll: 6, dragFree: true },
              },
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 sm:-ml-3 md:-ml-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <CarouselItem 
                  key={idx} 
                  className="pl-2 sm:pl-3 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6"
                >
                  <YouTubeVideoCardSkeleton />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    );
  }

  if (data?.message) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Recommended for You</h2>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <p>{data.message}</p>
        </div>
      </div>
    );
  }

  const videos = data?.recommendedVideos || [];

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Recommended for You</h2>
      </div>
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 1,
            dragFree: true,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 1, dragFree: true },
              "(min-width: 641px) and (max-width: 768px)": { slidesToScroll: 2, dragFree: true },
              "(min-width: 769px) and (max-width: 1024px)": { slidesToScroll: 3, dragFree: true },
              "(min-width: 1025px) and (max-width: 1280px)": { slidesToScroll: 4, dragFree: true },
              "(min-width: 1281px) and (max-width: 1536px)": { slidesToScroll: 5, dragFree: true },
              "(min-width: 1537px)": { slidesToScroll: 6, dragFree: true },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 sm:-ml-3 md:-ml-4">
            {videos.map((video, index) => (
              <CarouselItem 
                key={`${video.id}-${index}`} 
                className="pl-2 sm:pl-3 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6"
              >
                <YouTubeVideoCard video={video} channelId={video.channelId} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious 
            className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10"
          />
          <CarouselNext 
            className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10"
          />
        </Carousel>
      </div>
    </div>
  );
}

