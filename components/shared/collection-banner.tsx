"use client";

import Image from "next/image";
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb";

interface CollectionBannerProps {
  imageUrl?: string | null;
  fallbackGradient?: boolean;
}

export function CollectionBanner({ imageUrl, fallbackGradient = true }: CollectionBannerProps) {
  return (
    <div className="relative -mt-[65px] h-[30vh] min-h-[200px] max-h-[300px] sm:h-[40vh] sm:min-h-[250px] md:h-[50vh] md:min-h-[300px] overflow-hidden">
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt="Banner"
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized
          />
          {/* Dark overlay - blends with dark theme and stays dark in light theme */}
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent" />
        </>
      ) : fallbackGradient ? (
        <div className="w-full h-full bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30" />
      ) : null}
    </div>
  );
}

