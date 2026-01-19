"use client";

import Image from "next/image";
import { PlayCircle, ListVideo } from "lucide-react";

import { YouTubePlaylist } from "@/hooks/use-youtube-channel";
import { cn } from "@/lib/utils";

interface YouTubePlaylistCardProps {
  playlist: YouTubePlaylist;
  className?: string;
  onClick?: (playlist: YouTubePlaylist) => void;
}

function formatPublishedDate(publishedAt: string): string {
  const date = new Date(publishedAt);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function YouTubePlaylistCard({ playlist, className, onClick }: YouTubePlaylistCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(playlist);
    } else {
      window.open(playlist.playlistUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={cn("relative bg-card rounded-lg overflow-hidden border-2 border-border cursor-pointer group", className)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="relative aspect-video bg-muted">
        {playlist.thumbnail ? (
          <Image
            src={playlist.thumbnail}
            alt={playlist.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 200px, 320px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-muted-foreground">
            <ListVideo className="h-8 w-8" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/30" />

        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-white text-sm px-2 py-1 rounded-full">
          <ListVideo className="h-3 w-3" />
          <span>{playlist.itemCount}</span>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 text-black text-sm font-semibold px-3 py-1 rounded-full shadow-md group-hover:bg-white">
          <PlayCircle className="h-4 w-4" />
          <span>View playlist</span>
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-semibold line-clamp-2">{playlist.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1">{playlist.channelTitle}</p>
        <p className="text-sm text-muted-foreground">{formatPublishedDate(playlist.publishedAt)}</p>
      </div>
    </div>
  );
}


