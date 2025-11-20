"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { TMDBVideo } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";
import MediaModal from "./media-modal";

interface VideosSectionProps {
  videos: TMDBVideo[];
  isLoading?: boolean;
  title: string;
}

export default function VideosSection({ videos, isLoading, title }: VideosSectionProps) {
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">Videos</h2>
        <Skeleton className="aspect-video rounded-lg mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (!videos || videos.length === 0) {
    return null;
  }

  // Filter to only YouTube videos
  const youtubeVideos = videos.filter((v) => v.site === "YouTube");

  if (youtubeVideos.length === 0) {
    return null;
  }

  // Separate trailer from other videos
  const trailer = youtubeVideos.find((v) => v.type === "Trailer");
  const otherVideos = youtubeVideos.filter((v) => v.id !== trailer?.id);

  const allVideos = trailer ? [trailer, ...otherVideos] : otherVideos;
  const maxDisplayed = trailer ? 7 : 6; // 1 trailer + 6 others, or just 6 others

  return (
    <>
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">Videos</h2>

        {/* Featured Video (Trailer) */}
        {trailer && (
          <div
            className="relative aspect-video rounded-lg overflow-hidden mb-8 bg-muted group cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => {
              const index = allVideos.findIndex((v) => v.id === trailer.id);
              setSelectedVideoIndex(index);
            }}
          >
            <img
              src={`https://img.youtube.com/vi/${trailer.key}/maxresdefault.jpg`}
              alt={trailer.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
              <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="h-10 w-10 text-black fill-black" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
              <p className="text-white text-lg font-semibold">{trailer.name}</p>
            </div>
          </div>
        )}

        {/* Video Grid */}
        {otherVideos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherVideos.slice(0, 6).map((video, gridIndex) => {
              const index = allVideos.findIndex((v) => v.id === video.id);
              const thumbnailUrl = `https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`;
              const isLastItem = gridIndex === 5 && allVideos.length > maxDisplayed;
              const remainingCount = allVideos.length - maxDisplayed;

              return (
                <div
                  key={video.id}
                  className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group hover:scale-105 transition-transform"
                  onClick={() => setSelectedVideoIndex(index)}
                >
                  <img
                    src={thumbnailUrl}
                    alt={video.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`;
                    }}
                  />
                  {isLastItem ? (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center group-hover:bg-black/70 transition-colors">
                      <div className="text-white text-2xl font-bold">
                        +{remainingCount}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="h-8 w-8 text-black fill-black" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white text-sm font-medium line-clamp-2">{video.name}</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Media Modal */}
      {selectedVideoIndex !== null && (
        <MediaModal
          items={allVideos.map((video) => ({ type: "video" as const, data: video }))}
          initialIndex={selectedVideoIndex}
          isOpen={selectedVideoIndex !== null}
          onClose={() => setSelectedVideoIndex(null)}
          title={title}
        />
      )}
    </>
  );
}

