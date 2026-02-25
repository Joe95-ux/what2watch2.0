"use client";

import { Play } from "lucide-react";
import { TMDBVideo, getYouTubeThumbnailUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface VideosCarouselProps {
  videos: TMDBVideo[];
  onVideoSelect: (video: TMDBVideo) => void;
}

export default function VideosCarousel({ videos, onVideoSelect }: VideosCarouselProps) {
  // Filter to only YouTube videos and prioritize trailers/teasers
  const youtubeVideos = videos
    .filter((v) => v.site === "YouTube")
    .sort((a, b) => {
      // Prioritize: Official Trailer > Trailer > Teaser > Others
      const typeOrder = (type: string, official: boolean) => {
        if (type === "Trailer" && official) return 0;
        if (type === "Trailer") return 1;
        if (type === "Teaser") return 2;
        return 3;
      };
      return typeOrder(a.type, a.official) - typeOrder(b.type, b.official);
    });

  if (youtubeVideos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Videos</h3>
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 1,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {youtubeVideos.map((video) => (
              <CarouselItem key={video.id} className="pl-2 md:pl-4 basis-[280px]">
              <button
                onClick={() => onVideoSelect(video)}
                className={cn(
                  "group relative w-full h-[158px] rounded-lg overflow-hidden",
                  "bg-muted hover:scale-105 transition-transform duration-300",
                  "focus:outline-none"
                )}
              >
                  {/* Thumbnail */}
                  <div className="absolute inset-0">
                    <Image
                      src={getYouTubeThumbnailUrl(video.key, "hqdefault")}
                      alt={video.name}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        // Fallback to lower quality thumbnail
                        const target = e.target as HTMLImageElement;
                        target.src = getYouTubeThumbnailUrl(video.key, "mqdefault");
                      }}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  </div>

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="h-14 w-14 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                    <Play className="h-7 w-7 text-black fill-black" />
                  </div>
                </div>

                  {/* Video Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                    <p className="text-white text-sm font-medium line-clamp-1 drop-shadow-lg">
                      {video.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {video.official && (
                        <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded">
                          Official
                        </span>
                      )}
                      <span className="text-xs text-white/70 capitalize">
                        {video.type}
                      </span>
                    </div>
                  </div>
                </button>
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

