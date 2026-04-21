"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import { cn } from "@/lib/utils";

export function PickForTonightConfidenceRow({
  justwatchRank24h,
  justwatchRankDelta24h,
  justwatchRankUrl,
  imdbRating,
}: {
  justwatchRank24h: number | null;
  justwatchRankDelta24h: number | null;
  justwatchRankUrl: string | null;
  imdbRating: number | null;
}) {
  if (justwatchRank24h == null && imdbRating == null) return null;

  return (
    <div className="mt-2 flex items-center gap-3">
      {justwatchRank24h != null && (
        <div className="inline-flex items-center gap-1.5">
          {justwatchRankUrl ? (
            <Link href={justwatchRankUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:opacity-80">
              <Image src="/jw-icon.png" alt="JustWatch" width={16} height={16} className="object-contain" unoptimized />
              <span className="text-xs font-medium text-jw-gold">#{justwatchRank24h}</span>
            </Link>
          ) : (
            <>
              <Image src="/jw-icon.png" alt="JustWatch" width={16} height={16} className="object-contain" unoptimized />
              <span className="text-xs font-medium text-jw-gold">#{justwatchRank24h}</span>
            </>
          )}
          {justwatchRankDelta24h != null && justwatchRankDelta24h !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium text-white",
                justwatchRankDelta24h > 0 ? "bg-green-600" : "bg-red-600"
              )}
            >
              {justwatchRankDelta24h > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {Math.abs(justwatchRankDelta24h)}
            </span>
          )}
        </div>
      )}

      {imdbRating != null && (
        <div className="inline-flex items-center gap-1.5">
          <IMDBBadge size={16} />
          <span className="text-xs font-medium">{imdbRating.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
