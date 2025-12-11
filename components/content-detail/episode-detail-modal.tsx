"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Star, Tv } from "lucide-react";
import { TMDBSeries, TMDBVideo, getPosterUrl } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import TrailerModal from "@/components/browse/trailer-modal";
import { format } from "date-fns";

interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
}

interface TVShowDetails {
  created_by?: Array<{ id: number; name: string; profile_path?: string | null }>;
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job: string;
    }>;
  };
  genres?: Array<{ id: number; name: string }>;
  first_air_date?: string;
  episode_run_time?: number[];
  vote_average?: number;
  external_ids?: {
    imdb_id?: string | null;
  };
  imdb_id?: string | null;
}

interface EpisodeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  episode: Episode | null;
  tvShow: TMDBSeries;
  tvShowDetails: TVShowDetails | null;
  trailer: TMDBVideo | null;
}

export default function EpisodeDetailModal({
  isOpen,
  onClose,
  episode,
  tvShow,
  tvShowDetails,
  trailer,
}: EpisodeDetailModalProps) {
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  if (!episode) return null;

  const tvShowTitle = tvShow.name;
  const posterPath = tvShow.poster_path || tvShow.backdrop_path;
  const backdropPath = tvShow.backdrop_path || tvShow.poster_path;
  
  // Get creators
  const creators = tvShowDetails?.created_by || [];
  const creatorsText = creators.length > 0 
    ? creators.map((c) => c.name).join(", ")
    : "N/A";

  // Get top cast (first 4)
  const topCast = tvShowDetails?.credits?.cast?.slice(0, 4) || [];
  const starsText = topCast.length > 0
    ? topCast.map((c) => c.name).join(", ")
    : "N/A";

  // Format release year
  const releaseYear = tvShowDetails?.first_air_date
    ? new Date(tvShowDetails.first_air_date).getFullYear().toString()
    : null;

  // Format runtime
  const runtime = tvShowDetails?.episode_run_time?.[0] || episode.runtime;
  const formattedRuntime = runtime ? `${runtime} min` : null;

  // Format episode air date
  const episodeAirDate = episode.air_date
    ? format(new Date(episode.air_date), "MMM d, yyyy")
    : null;

  // Get rating
  const rating = tvShowDetails?.vote_average || tvShow.vote_average || 0;
  const imdbId = tvShowDetails?.external_ids?.imdb_id || tvShowDetails?.imdb_id || null;

  // Get genres
  const genres = tvShowDetails?.genres || [];

  const handleOpenTrailer = () => {
    if (trailer) {
      setIsTrailerOpen(true);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="mx-2 w-full max-w-[calc(100vw-1rem)] sm:max-w-3xl lg:max-w-[50rem] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="sr-only">Episode Details</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-6">
            <div className="space-y-6 pb-6">
              {/* First Div: TV Show Poster and Metadata */}
              <div className="flex flex-row gap-4">
                {/* Poster */}
                {posterPath ? (
                  <div className="relative w-20 h-28 sm:w-24 sm:h-36 rounded overflow-hidden flex-shrink-0 bg-muted">
                    <Image
                      src={getPosterUrl(posterPath, "w500")}
                      alt={tvShowTitle}
                      fill
                      className="object-cover"
                      sizes="96px"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-20 h-28 sm:w-24 sm:h-36 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                    <Tv className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Metadata */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {/* Line 1: Title */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold truncate sm:truncate-none">
                      {tvShowTitle}
                    </h3>
                  </div>

                  {/* Line 2: Release year, runtime/episodes, genres */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                    {releaseYear && <span>{releaseYear}</span>}
                    {formattedRuntime && (
                      <>
                        {releaseYear && <span>•</span>}
                        <span>{formattedRuntime}</span>
                      </>
                    )}
                    {genres.length > 0 && (
                      <>
                        {(releaseYear || formattedRuntime) && <span>•</span>}
                        <span>{genres.slice(0, 2).map((g: { id: number; name: string }) => g.name).join(", ")}</span>
                      </>
                    )}
                  </div>

                  {/* Line 3: Rating */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                    {rating > 0 && (
                      <div className="flex items-center gap-1.5">
                        {imdbId ? (
                          <IMDBBadge size={16} />
                        ) : (
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        )}
                        <span className="font-semibold">
                          {rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Second Div: Episode Synopsis, Creator, Stars */}
              <div className="space-y-4 border-t pt-6">
                {/* Episode Title */}
                <div>
                  <h4 className="text-xl font-bold mb-2">
                    S{episode.season_number.toString().padStart(2, "0")}E{episode.episode_number.toString().padStart(2, "0")}: {episode.name}
                  </h4>
                  {episodeAirDate && (
                    <p className="text-sm text-muted-foreground">
                      Aired {episodeAirDate}
                    </p>
                  )}
                </div>

                {/* Episode Synopsis */}
                {episode.overview && (
                  <div>
                    <h5 className="text-sm font-semibold mb-2 text-muted-foreground">Synopsis</h5>
                    <p className="text-sm leading-relaxed">{episode.overview}</p>
                  </div>
                )}

                {/* Creator */}
                <div>
                  <h5 className="text-sm font-semibold mb-2 text-muted-foreground">Creators</h5>
                  <p className="text-sm">{creatorsText}</p>
                </div>

                {/* Stars */}
                <div>
                  <h5 className="text-sm font-semibold mb-2 text-muted-foreground">Stars</h5>
                  <p className="text-sm">{starsText}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer: Close and Watch Trailer */}
          <div className="border-t px-6 py-4 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              Close
            </Button>
            {trailer && (
              <Button
                onClick={handleOpenTrailer}
                className="cursor-pointer"
              >
                <Play className="h-4 w-4 mr-2" />
                Watch Trailer
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {trailer && (
        <TrailerModal
          video={trailer}
          videos={[]}
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
          title={tvShowTitle}
          initialVideoId={trailer.id ?? null}
        />
      )}
    </>
  );
}

