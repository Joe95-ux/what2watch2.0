"use client";

import { useMemo, useState, type MouseEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Play, Heart, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import TrailerModal from "@/components/browse/trailer-modal";
import { useContentVideos, useWatchProviders } from "@/hooks/use-content-details";
import { createContentUrl } from "@/lib/content-slug";
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb";

import type { TMDBPerson, TMDBPersonMovieCredits, TMDBPersonTVCredits, TMDBPersonMovieCredit, TMDBPersonTVCredit, TMDBVideo } from "@/lib/tmdb";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MediaType = "movie" | "tv";

type TopRatedItem =
  | (TMDBPersonMovieCredit & { type: "movie" })
  | (TMDBPersonTVCredit & { type: "tv" });

function formatReleaseDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return null;
  }
}

function pickTrailer(videosData: { results: TMDBVideo[] } | null | undefined) {
  const results = videosData?.results ?? [];
  return results.find((v) => v.site === "YouTube" && v.type === "Trailer") ?? results.find((v) => v.site === "YouTube") ?? null;
}

export default function PersonHeroSection({
  person,
  profileImage,
  movieCredits,
  tvCredits,
  onBack,
}: {
  person: TMDBPerson;
  profileImage: string | null;
  movieCredits: TMDBPersonMovieCredits | null;
  tvCredits: TMDBPersonTVCredits | null;
  onBack: () => void;
}) {
  const router = useRouter();
  const [isHearted, setIsHearted] = useState(false);

  const allMovies = useMemo(() => {
    const cast = movieCredits?.cast ?? [];
    const crew = movieCredits?.crew ?? [];
    return [...cast, ...crew];
  }, [movieCredits]);

  const allTV = useMemo(() => {
    const cast = tvCredits?.cast ?? [];
    const crew = tvCredits?.crew ?? [];
    return [...cast, ...crew];
  }, [tvCredits]);

  const latestMovie = useMemo(() => {
    const list = allMovies
      .filter((m) => !!m.release_date)
      .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
    return list[0] ?? null;
  }, [allMovies]);

  const topRatedItems = useMemo(() => {
    const movies: TopRatedItem[] = allMovies
      .filter((m) => !!m.poster_path)
      .map((m) => ({ ...m, type: "movie" as const }));
    const tv: TopRatedItem[] = allTV
      .filter((s) => !!s.poster_path)
      .map((s) => ({ ...s, type: "tv" as const }));

    return [...movies, ...tv]
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .slice(0, 3);
  }, [allMovies, allTV]);

  // Latest movie trailer preview
  const latestMovieId = latestMovie?.id ?? null;
  const {
    data: latestVideosData,
    isLoading: latestVideosLoading,
  } = useContentVideos("movie", latestMovieId, !!latestMovieId);
  const latestTrailer = pickTrailer(latestVideosData);

  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [trailerVideo, setTrailerVideo] = useState<TMDBVideo | null>(null);
  const [trailerVideos, setTrailerVideos] = useState<TMDBVideo[]>([]);
  const [trailerTitle, setTrailerTitle] = useState<string>("");
  const [initialVideoId, setInitialVideoId] = useState<string | null>(null);

  const openTrailer = (title: string, video: TMDBVideo | null, videos: TMDBVideo[]) => {
    if (!video) return;
    setTrailerTitle(title);
    setTrailerVideo(video);
    setTrailerVideos(videos);
    setInitialVideoId(video.id ?? video.id);
    setIsTrailerOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 cursor-pointer">
        Back
      </Button>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_200px]">
        {/* Poster Column */}
        <div className="relative hidden lg:block rounded-lg rounded-tl-none bg-muted/20 overflow-hidden aspect-[2/3] border border-white/10">
          {profileImage ? (
            <Image
              src={profileImage}
              alt={person.name}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          {/* Heart - Top Left */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsHearted((v) => !v);
            }}
            className={cn(
              "absolute top-3 left-3 z-10 h-11 w-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-colors",
            )}
            aria-label={isHearted ? "Remove from favorites" : "Add to favorites"}
          >
            {isHearted ? <Check className="h-5 w-5 text-[#E0B416]" /> : <Heart className="h-5 w-5 text-white" />}
          </button>
        </div>

        {/* Banner Column */}
        <div className="relative rounded-lg rounded-tl-none lg:rounded-tl-lg bg-muted/20 overflow-hidden min-h-[260px] md:min-h-[400px] lg:min-h-[260px] border border-white/10">
          {latestMovie?.backdrop_path ? (
            <Image
              src={getBackdropUrl(latestMovie.backdrop_path, "w1280")}
              alt={`${latestMovie.title} backdrop`}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

          <div className="absolute top-4 left-4 right-4">
            <h1 className="text-[1.3rem] sm:text-3xl font-semibold text-white drop-shadow">
              {person.name}
            </h1>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                <button
                  type="button"
                  disabled={!latestTrailer || latestVideosLoading}
                  onClick={() => openTrailer(latestMovie?.title ?? person.name, latestTrailer, latestVideosData?.results ?? [])}
                  className="flex items-center justify-center h-16 w-16 rounded-full border-2 border-white/60 bg-white/10 backdrop-blur hover:bg-white/20 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Play trailer"
                >
                  <Play className="h-7 w-7 text-white fill-white" />
                </button>

                <div className="flex flex-col gap-1">
                  <p className="text-white font-semibold text-lg">Play Trailer</p>
                  {latestMovie?.release_date && (
                    <p className="text-white/80 text-sm">
                      {formatReleaseDate(latestMovie.release_date)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Rated Column */}
        <div className="hidden lg:block">
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Top rated movies/tv shows</h2>
            <div className="space-y-3">
              {topRatedItems.map((item) => (
                <TopRatedMediaCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onOpenTrailer={(payload) => {
                    openTrailer(payload.title, payload.video, payload.videos);
                  }}
                  onNavigate={() => {
                    const title = item.type === "movie" ? item.title : item.name;
                    router.push(createContentUrl(item.type, item.id, title));
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <TrailerModal
        video={trailerVideo}
        videos={trailerVideos}
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        title={trailerTitle}
        initialVideoId={initialVideoId}
      />
    </div>
  );
}

function TopRatedMediaCard({
  item,
  onOpenTrailer,
  onNavigate,
}: {
  item: TopRatedItem;
  onOpenTrailer: (payload: { title: string; video: TMDBVideo | null; videos: TMDBVideo[] }) => void;
  onNavigate: () => void;
}) {
  const { data: videosData } = useContentVideos(item.type, item.id, true);
  const trailer = pickTrailer(videosData);

  const { data: watchAvailability } = useWatchProviders(item.type, item.id, "US");
  const primaryOffer =
    watchAvailability?.offersByType?.flatrate?.[0] ??
    watchAvailability?.offersByType?.buy?.[0] ??
    watchAvailability?.offersByType?.rent?.[0] ??
    watchAvailability?.allOffers?.[0] ??
    null;

  const title = item.type === "movie" ? item.title : item.name;
  const releaseDate = item.type === "movie" ? (item.release_date ?? null) : (item.first_air_date ?? null);
  const releaseDateFormatted = formatReleaseDate(releaseDate);

  return (
    <div
      className={cn(
        "relative cursor-pointer rounded-lg border border-border bg-card/80 overflow-hidden transition hover:bg-card flex",
      )}
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onNavigate();
      }}
    >
      <div className="relative w-28 h-40 sm:w-30 sm:h-44 bg-muted overflow-hidden">
        {item.poster_path ? (
          <Image
            src={getPosterUrl(item.poster_path, "w500")}
            alt={title}
            fill
            className="object-cover"
            sizes="112px"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">No Image</div>
        )}

        {/* Play Trailer (bottom of poster) */}
        <div className="absolute bottom-8 left-2 right-2 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              onOpenTrailer({
                title,
                video: trailer,
                videos: videosData?.results ?? [],
              });
            }}
            disabled={!trailer}
            className="flex flex-col items-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label={`Play trailer for ${title}`}
          >
            <span className="flex items-center justify-center h-10 w-10 rounded-full bg-black/70 hover:bg-black/80 border border-white/20 transition">
              <Play className="h-5 w-5 text-white fill-white" />
            </span>
            <span className="text-[10px] font-medium text-white">Play Trailer</span>
          </button>
        </div>

        {/* Watch Now provider button (bottom of poster) */}
        {primaryOffer && (
          <div className="absolute bottom-0 left-0 right-0 p-1">
            <a
              href={primaryOffer.standardWebUrl ?? primaryOffer.deepLinkUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="flex items-center h-7 w-full overflow-hidden rounded bg-black/70 hover:bg-black/80 transition-colors cursor-pointer"
            >
              {primaryOffer.iconUrl ? (
                <Image
                  src={primaryOffer.iconUrl}
                  alt={primaryOffer.providerName}
                  width={28}
                  height={28}
                  className="object-contain rounded-l w-7 h-7 block flex-shrink-0"
                  unoptimized
                />
              ) : null}
              <span
                className={cn(
                  "pl-2 pr-2 flex items-center text-[12px] font-medium truncate text-white",
                  !primaryOffer.iconUrl && "px-2",
                )}
              >
                Watch Now
              </span>
            </a>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 p-3 space-y-1">
        <p className="text-sm font-semibold truncate" title={title}>
          {title}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{releaseDateFormatted ?? "—"}</span>
          <span className="text-muted-foreground">•</span>
          <Badge variant="secondary" className="h-5 px-2 py-0 text-[11px]">
            {item.type === "movie" ? "Movie" : "TV"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

