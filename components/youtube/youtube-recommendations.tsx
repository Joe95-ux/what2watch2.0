"use client";

import { Sparkles } from "lucide-react";
import { useYouTubeRecommendations } from "@/hooks/use-youtube-recommendations";
import YouTubeVideoCard from "@/components/youtube/youtube-video-card";
import { Skeleton } from "@/components/ui/skeleton";
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
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
            slidesToScroll: 4,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 1 },
              "(max-width: 1024px)": { slidesToScroll: 2 },
              "(max-width: 1280px)": { slidesToScroll: 3 },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4 gap-4">
            {videos.map((video) => (
              <CarouselItem key={video.id} className="pl-2 md:pl-4 basis-[280px] sm:basis-[300px] lg:basis-[320px]">
                <YouTubeVideoCard video={video} channelId={video.channelId} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer" />
          <CarouselNext className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer" />
        </Carousel>
      </div>
    </div>
  );
}

