"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Play, Heart } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import TrailerModal from "@/components/browse/trailer-modal";
import { useContentVideos, useWatchProviders } from "@/hooks/use-content-details";
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb";
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useToggleFavoritePersonality } from "@/hooks/use-favorite-personalities";

import type { TMDBPerson, TMDBPersonMovieCredits, TMDBPersonTVCredits, TMDBVideo } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

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
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const favoritePersonality = useToggleFavoritePersonality();
  const isHearted = favoritePersonality.isFavorite(person.id);

  const slides = useMemo(() => {
    const movies =
      [...(movieCredits?.cast ?? []), ...(movieCredits?.crew ?? [])].map((m) => ({
        id: m.id,
        type: "movie" as const,
        title: m.title,
        backdropPath: m.backdrop_path,
        posterPath: m.poster_path,
        date: m.release_date ?? null,
        voteAverage: m.vote_average ?? 0,
      }));
    const tv =
      [...(tvCredits?.cast ?? []), ...(tvCredits?.crew ?? [])].map((t) => ({
        id: t.id,
        type: "tv" as const,
        title: t.name,
        backdropPath: t.backdrop_path,
        posterPath: t.poster_path,
        date: t.first_air_date ?? null,
        voteAverage: t.vote_average ?? 0,
      }));

    const deduped = [...movies, ...tv].filter(
      (item, index, arr) =>
        arr.findIndex((x) => x.id === item.id && x.type === item.type) === index,
    );

    const latest = [...deduped]
      .filter((x) => !!x.date)
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())[0];

    const topRated = [...deduped]
      .sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
      .slice(0, 10);

    const combined = latest
      ? [latest, ...topRated.filter((x) => !(x.id === latest.id && x.type === latest.type))]
      : topRated;

    return combined;
  }, [movieCredits, tvCredits]);

  const movieCount = useMemo(() => {
    const ids = new Set(
      [...(movieCredits?.cast ?? []), ...(movieCredits?.crew ?? [])].map((x) => x.id),
    );
    return ids.size;
  }, [movieCredits]);

  const tvCount = useMemo(() => {
    const ids = new Set(
      [...(tvCredits?.cast ?? []), ...(tvCredits?.crew ?? [])].map((x) => x.id),
    );
    return ids.size;
  }, [tvCredits]);

  const currentSlide = slides[activeSlide] ?? slides[0] ?? null;
  const currentSlideId = currentSlide?.id ?? null;
  const currentSlideType = currentSlide?.type ?? "movie";

  const {
    data: currentVideosData,
    isLoading: currentVideosLoading,
  } = useContentVideos(currentSlideType, currentSlideId, !!currentSlideId);
  const currentTrailer = pickTrailer(currentVideosData);
  const { data: currentWatchAvailability } = useWatchProviders(
    currentSlideType,
    currentSlideId,
    "US",
  );
  const currentPrimaryOffer =
    currentWatchAvailability?.offersByType?.flatrate?.[0] ??
    currentWatchAvailability?.offersByType?.buy?.[0] ??
    currentWatchAvailability?.offersByType?.rent?.[0] ??
    currentWatchAvailability?.allOffers?.[0] ??
    null;

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

  const handleFavoriteClick = async () => {
    if (!isSignedIn) {
      toast.info("Sign in to favorite personalities.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
      return;
    }

    try {
      await favoritePersonality.toggle({
        ...person,
        movieCount,
        tvCount,
      });
    } catch {
      toast.error("Could not update favorite personality.");
    }
  };

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setActiveSlide(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi || isCarouselPaused || slides.length <= 1) return;
    const id = setInterval(() => {
      if (carouselApi.canScrollNext()) {
        carouselApi.scrollNext();
      } else {
        carouselApi.scrollTo(0);
      }
    }, 4500);
    return () => clearInterval(id);
  }, [carouselApi, isCarouselPaused, slides.length]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 cursor-pointer">
        Back
      </Button>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Poster Column */}
        <div className="relative hidden lg:block rounded-lg bg-muted/20 overflow-hidden aspect-[2/3] border border-white/10">
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
              handleFavoriteClick();
            }}
            className={cn(
              "absolute top-3 left-3 z-10 h-11 w-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-colors",
            )}
            aria-label={isHearted ? "Remove from favorites" : "Add to favorites"}
            disabled={favoritePersonality.isLoading}
          >
            {isHearted ? (
              <Heart className="h-5 w-5 text-green-500 fill-green-500" />
            ) : (
              <Heart className="h-5 w-5 text-white" />
            )}
          </button>
        </div>

        {/* Banner Column */}
        <Carousel
          setApi={setCarouselApi}
          opts={{ loop: slides.length > 1 }}
          className="rounded-lg rounded-tl-none lg:rounded-tl-lg h-full"
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
        >
          <CarouselContent className="ml-0">
            {slides.length > 0 ? (
              slides.map((slide, index) => (
                <CarouselItem key={`${slide.type}-${slide.id}-${index}`} className="pl-0">
                  <div className="relative rounded-lg rounded-tl-none lg:rounded-tl-lg bg-muted/20 overflow-hidden min-h-[260px] md:min-h-[400px] lg:h-[390px] lg:min-h-0 border border-white/10">
                    {slide.backdropPath ? (
                      <Image
                        src={getBackdropUrl(slide.backdropPath, "w1280")}
                        alt={`${slide.title} backdrop`}
                        fill
                        className="object-cover"
                        priority={index === 0}
                        unoptimized
                      />
                    ) : slide.posterPath ? (
                      <Image
                        src={getPosterUrl(slide.posterPath, "w500")}
                        alt={slide.title}
                        fill
                        className="object-cover"
                        priority={index === 0}
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
                      <p className="text-white/80 text-xs sm:text-sm mt-1">
                        {slide.title}
                      </p>
                    </div>

                    {index === activeSlide && (
                      <div className="absolute bottom-6 left-6 right-6 z-10">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                            <button
                              type="button"
                              disabled={!currentTrailer || currentVideosLoading}
                              onClick={() =>
                                openTrailer(
                                  currentSlide?.title ?? person.name,
                                  currentTrailer,
                                  currentVideosData?.results ?? [],
                                )
                              }
                              className="flex items-center justify-center h-16 w-16 rounded-full border-2 border-white/60 bg-white/10 backdrop-blur hover:bg-white/20 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              aria-label="Play trailer"
                            >
                              <Play className="h-7 w-7 text-white fill-white" />
                            </button>

                            <div className="flex flex-col gap-1">
                              <p className="text-white font-semibold text-lg">Play Trailer</p>
                              {currentSlide?.date && (
                                <p className="text-white/80 text-sm">
                                  {formatReleaseDate(currentSlide.date)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CarouselItem>
              ))
            ) : (
              <CarouselItem className="pl-0">
                <div className="relative rounded-lg rounded-tl-none lg:rounded-tl-lg bg-muted/20 overflow-hidden min-h-[260px] md:min-h-[400px] lg:h-[390px] lg:min-h-0 border border-white/10">
                  <div className="absolute inset-0 bg-muted" />
                </div>
              </CarouselItem>
            )}
          </CarouselContent>

          {currentPrimaryOffer && (
            <div className="absolute bottom-0 right-0 z-20">
              <a
                href={currentPrimaryOffer.standardWebUrl ?? currentPrimaryOffer.deepLinkUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-muted/20 backdrop-blur-sm border-t border-l border-white/10 rounded-tl-lg px-4 py-2 text-[0.85rem] font-medium text-white hover:bg-muted/30 transition-colors cursor-pointer flex items-center gap-2"
              >
                {currentPrimaryOffer.iconUrl ? (
                  <Image
                    src={currentPrimaryOffer.iconUrl}
                    alt={currentPrimaryOffer.providerName}
                    width={18}
                    height={18}
                    className="object-contain rounded-sm"
                    unoptimized
                  />
                ) : null}
                <span>Watch Now</span>
              </a>
            </div>
          )}
        </Carousel>

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

