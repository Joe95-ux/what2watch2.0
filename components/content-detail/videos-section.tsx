"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TMDBVideo, getYouTubeEmbedUrl } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";
import TrailerModal from "@/components/browse/trailer-modal";

interface VideosSectionProps {
  videos: TMDBVideo[];
  isLoading?: boolean;
  title: string;
}

export default function VideosSection({ videos, isLoading, title }: VideosSectionProps) {
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

  // Separate trailer from other videos
  const trailer = videos.find((v) => v.type === "Trailer" && v.site === "YouTube");
  const otherVideos = videos.filter((v) => v.id !== trailer?.id);

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">Videos</h2>

      {/* Featured Video (Trailer) */}
      {trailer && (
        <div className="relative aspect-video rounded-lg overflow-hidden mb-8 bg-muted group cursor-pointer">
          <iframe
            src={getYouTubeEmbedUrl(trailer.key, false, true)}
            className="w-full h-full"
            allow="encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={trailer.name}
          />
        </div>
      )}

      {/* Video Grid */}
      {otherVideos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherVideos.slice(0, 6).map((video) => (
            <VideoThumbnail key={video.id} video={video} videos={videos} title={title} />
          ))}
        </div>
      )}
    </section>
  );
}

function VideoThumbnail({ video, videos, title }: { video: TMDBVideo; videos: TMDBVideo[]; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`;

  return (
    <>
      <div
        className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group hover:scale-105 transition-transform"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={thumbnailUrl}
          alt={video.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="h-8 w-8 text-black fill-black" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm font-medium line-clamp-2">{video.name}</p>
        </div>
      </div>
      <TrailerModal
        video={video}
        videos={videos}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
      />
    </>
  );
}

