"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Play, Plus, Heart, Star, Clock, Calendar, Volume2, VolumeX } from "lucide-react";
import { TMDBMovie, TMDBSeries, getBackdropUrl, getPosterUrl, getYouTubeEmbedUrl, TMDBVideo } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMovieDetails,
  useTVDetails,
  useContentVideos,
  useTVSeasons,
  useTVSeasonDetails,
  useSimilarMovies,
  useRecommendedMovies,
  useSimilarTV,
  useRecommendedTV,
} from "@/hooks/use-content-details";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import VideosCarousel from "./videos-carousel";
import TrailerModal from "./trailer-modal";
import MoreLikeThis from "./more-like-this";
import { useAddRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useToggleFavorite } from "@/hooks/use-favorites";
import AddToPlaylistDropdown from "@/components/playlists/add-to-playlist-dropdown";

interface ContentDetailModalProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  isOpen: boolean;
  onClose: () => void;
}

export default function ContentDetailModal({
  item,
  type,
  isOpen,
  onClose,
}: ContentDetailModalProps) {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<TMDBVideo | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compatibility
  
  // Track recently viewed
  const addRecentlyViewed = useAddRecentlyViewed();
  const toggleFavorite = useToggleFavorite();

  // Fetch details based on type
  const { data: movieDetails, isLoading: isLoadingMovie } = useMovieDetails(
    type === "movie" ? item.id : null
  );
  const { data: tvDetails, isLoading: isLoadingTV } = useTVDetails(
    type === "tv" ? item.id : null
  );
  const { data: videosData } = useContentVideos(type, item.id);
  const { data: seasonsData } = useTVSeasons(type === "tv" ? item.id : null);
  const { data: seasonDetails, isLoading: isLoadingSeasonDetails } = useTVSeasonDetails(
    type === "tv" ? item.id : null,
    selectedSeason
  );
  
  // Fetch similar/recommended content
  const { data: similarMovies, isLoading: isLoadingSimilarMovies } = useSimilarMovies(
    type === "movie" ? item.id : null
  );
  const { data: recommendedMovies, isLoading: isLoadingRecommendedMovies } = useRecommendedMovies(
    type === "movie" ? item.id : null
  );
  const { data: similarTV, isLoading: isLoadingSimilarTV } = useSimilarTV(
    type === "tv" ? item.id : null
  );
  const { data: recommendedTV, isLoading: isLoadingRecommendedTV } = useRecommendedTV(
    type === "tv" ? item.id : null
  );
  
  // Combine similar and recommended content (prioritize recommendations)
  // Fetch max 16 items for "More Like This" section
  const moreLikeThisItems = type === "movie"
    ? [...(recommendedMovies?.results || []), ...(similarMovies?.results || [])].slice(0, 16)
    : [...(recommendedTV?.results || []), ...(similarTV?.results || [])].slice(0, 16);
  
  const isLoadingMoreLikeThis = type === "movie"
    ? isLoadingRecommendedMovies || isLoadingSimilarMovies
    : isLoadingRecommendedTV || isLoadingSimilarTV;

  // Auto-select first season when seasons load
  useEffect(() => {
    if (type === "tv" && seasonsData && seasonsData.seasons.length > 0 && selectedSeason === null) {
      const firstRegularSeason = seasonsData.seasons.find((s) => s.season_number > 0);
      if (firstRegularSeason) {
        setSelectedSeason(firstRegularSeason.season_number);
      }
    }
  }, [type, seasonsData, selectedSeason]);

  // Track view when sheet opens
  useEffect(() => {
    if (isOpen) {
      const title = "title" in item ? item.title : item.name;
      addRecentlyViewed.mutate({
        tmdbId: item.id,
        mediaType: type,
        title: title,
        posterPath: item.poster_path || null,
        backdropPath: item.backdrop_path || null,
        releaseDate: "release_date" in item ? item.release_date || null : null,
        firstAirDate: "first_air_date" in item ? item.first_air_date || null : null,
      });
    }
  }, [isOpen, item, type, addRecentlyViewed]);

  const details = type === "movie" ? movieDetails : tvDetails;
  const isLoading = type === "movie" ? isLoadingMovie : isLoadingTV;

  const title = "title" in item ? item.title : item.name;
  const backdropPath = item.backdrop_path || item.poster_path;
  const posterPath = item.poster_path;

  // Find trailer for hero section
  const trailer: TMDBVideo | null =
    videosData?.results?.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
    ) ||
    videosData?.results?.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
    ) ||
    null;

  // All videos for carousel
  const allVideos = videosData?.results || [];

  // Format runtime
  const formatRuntime = (minutes: number | number[] | undefined): string => {
    if (!minutes) return "N/A";
    if (Array.isArray(minutes)) {
      return `${minutes[0]} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Format date
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right"
        className="!w-full sm:!w-[90vw] lg:!w-[80vw] xl:!max-w-[60rem] !h-full overflow-y-auto p-0 gap-0 [&>button]:hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 h-12 w-12 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors shadow-lg"
          aria-label="Close"
        >
          <X className="h-6 w-6 text-white" />
        </button>

        {/* Hero Section with Trailer/Backdrop */}
        <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
          {trailer && isOpen && videosData ? (
            <div className="absolute inset-0">
              <iframe
                key={`${trailer.key}-${isMuted}`}
                src={getYouTubeEmbedUrl(trailer.key, true, isMuted)}
                className="w-full h-full"
                allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ pointerEvents: "none" }}
                title="Trailer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
            </div>
          ) : backdropPath ? (
            <>
              <Image
                src={getBackdropUrl(backdropPath, "w1280")}
                alt={title}
                fill
                className="object-cover"
                priority
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}

          {/* Content Overlay */}
          <div className="absolute inset-0 flex items-end z-10">
            <div className="w-full px-6 sm:px-8 lg:px-12 pb-12">
              <div className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white drop-shadow-lg">
                  {title}
                </h1>
                <div className="flex items-center gap-4 mb-6 flex-wrap">
                  {item.vote_average > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-semibold">
                        {item.vote_average.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {details && (
                    <>
                      {type === "movie" && "runtime" in details && (
                        <div className="flex items-center gap-1.5 text-white/90">
                          <Clock className="h-4 w-4" />
                          <span>{formatRuntime(details.runtime)}</span>
                        </div>
                      )}
                      {type === "tv" && "episode_run_time" in details && details.episode_run_time?.[0] && (
                        <div className="flex items-center gap-1.5 text-white/90">
                          <Clock className="h-4 w-4" />
                          <span>{formatRuntime(details.episode_run_time[0])} per episode</span>
                        </div>
                      )}
                      {type === "movie" && "release_date" in details && (
                        <div className="flex items-center gap-1.5 text-white/90">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(details.release_date)}</span>
                        </div>
                      )}
                      {type === "tv" && "first_air_date" in details && (
                        <div className="flex items-center gap-1.5 text-white/90">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(details.first_air_date)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    className="bg-white text-black hover:bg-white/90 h-14 px-10 text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg rounded-md"
                    asChild
                  >
                    <Link href={`/${type}/${item.id}`}>
                      <Play className="size-6 mr-2.5 fill-black" />
                      Play
                    </Link>
                  </Button>
                  <AddToPlaylistDropdown
                    item={item}
                    type={type}
                    trigger={
                      <Button
                        size="lg"
                        variant="outline"
                        className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50 h-14 w-14 p-0 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105"
                      >
                        <Plus className="size-6 text-white" />
                      </Button>
                    }
                  />
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50 h-14 w-14 p-0 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105"
                    onClick={async () => {
                      await toggleFavorite.toggle(item, type);
                    }}
                  >
                    <Heart 
                      className={`size-6 ${
                        toggleFavorite.isFavorite(item.id, type)
                          ? "text-red-500 fill-red-500"
                          : "text-white"
                      }`} 
                    />
                  </Button>
                  {/* Mute/Unmute Toggle - Only show when trailer is available, on extreme right */}
                  {trailer && videosData && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50 h-14 w-14 p-0 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105 ml-auto"
                      onClick={() => setIsMuted(!isMuted)}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="size-6 text-white" />
                      ) : (
                        <Volume2 className="size-6 text-white" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-background">
          <div className="px-6 sm:px-8 lg:px-12 py-8">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Tagline */}
                  {details && "tagline" in details && details.tagline && typeof details.tagline === "string" && (
                    <div>
                      <p className="text-lg font-medium italic text-foreground/80">
                        {details.tagline}
                      </p>
                    </div>
                  )}
                  
                  {/* Overview */}
                  {item.overview && (
                    <div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.overview}
                      </p>
                    </div>
                  )}

                  {/* Genres */}
                  {details?.genres && details.genres.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Genres</h3>
                      <div className="flex flex-wrap gap-2">
                        {details.genres.map((genre) => (
                          <span
                            key={genre.id}
                            className="px-3 py-1 rounded-full bg-muted text-sm text-foreground"
                          >
                            {genre.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos Carousel */}
                  {allVideos.length > 0 && (
                    <VideosCarousel
                      videos={allVideos}
                      onVideoSelect={(video) => {
                        setSelectedVideo(video);
                        setIsTrailerModalOpen(true);
                      }}
                    />
                  )}

                  {/* TV Seasons & Episodes */}
                  {type === "tv" && seasonsData && (
                    <TVSeasonsSection
                      tvId={item.id}
                      seasons={seasonsData.seasons}
                      selectedSeason={selectedSeason}
                      onSeasonSelect={setSelectedSeason}
                      seasonDetails={seasonDetails}
                      isLoadingSeasonDetails={isLoadingSeasonDetails}
                    />
                  )}

                  {/* Additional Details */}
                  {details && (
                    <div>
                      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {type === "movie" && "release_date" in details && details.release_date && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Release Date</span>
                            <p className="font-medium text-foreground">{formatDate(details.release_date)}</p>
                          </div>
                        )}
                        {type === "tv" && "first_air_date" in details && details.first_air_date && (
                          <div>
                            <span className="text-muted-foreground block mb-1">First Air Date</span>
                            <p className="font-medium text-foreground">{formatDate(details.first_air_date)}</p>
                          </div>
                        )}
                        {type === "movie" && "runtime" in details && details.runtime && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Runtime</span>
                            <p className="font-medium text-foreground">{formatRuntime(details.runtime)}</p>
                          </div>
                        )}
                        {type === "tv" && "episode_run_time" in details && details.episode_run_time?.[0] && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Episode Runtime</span>
                            <p className="font-medium text-foreground">{formatRuntime(details.episode_run_time[0])}</p>
                          </div>
                        )}
                        {details.production_countries && details.production_countries.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Country</span>
                            <p className="font-medium text-foreground">
                              {details.production_countries.map((c) => c.name).join(", ")}
                            </p>
                          </div>
                        )}
                        {details.spoken_languages && details.spoken_languages.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Language</span>
                            <p className="font-medium text-foreground">
                              {details.spoken_languages.map((l) => l.english_name).join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {posterPath && (
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                      <Image
                        src={getPosterUrl(posterPath, "w500")}
                        alt={title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  {details && (
                    <div className="space-y-3 text-sm">
                      {type === "tv" && "number_of_seasons" in details && (
                        <div>
                          <span className="text-muted-foreground">Seasons</span>
                          <p className="font-medium">{details.number_of_seasons}</p>
                        </div>
                      )}
                      {type === "tv" && "number_of_episodes" in details && (
                        <div>
                          <span className="text-muted-foreground">Episodes</span>
                          <p className="font-medium">{details.number_of_episodes}</p>
                        </div>
                      )}
                      {details.production_companies && details.production_companies.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Production</span>
                          <p className="font-medium">
                            {details.production_companies
                              .slice(0, 3)
                              .map((c) => c.name)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* More Like This Section - Full Width, Outside Grid */}
              <div className="w-full mt-8">
                <MoreLikeThis
                  items={moreLikeThisItems}
                  type={type}
                  title="More Like This"
                  isLoading={isLoadingMoreLikeThis}
                />
              </div>
              </>
            )}
          </div>
        </div>

        {/* Trailer Modal */}
        {selectedVideo && (
          <TrailerModal
            video={selectedVideo}
            videos={allVideos}
            isOpen={isTrailerModalOpen}
            onClose={() => {
              setIsTrailerModalOpen(false);
              setSelectedVideo(null);
            }}
            title={title}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// TV Seasons & Episodes Section Component
interface TVSeasonsSectionProps {
  tvId: number;
  seasons: Array<{
    id: number;
    name: string;
    overview: string;
    season_number: number;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
  }>;
  selectedSeason: number | null;
  onSeasonSelect: (seasonNumber: number) => void;
  seasonDetails: {
    _id: string;
    air_date: string | null;
    episodes: Array<{
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
    }>;
    name: string;
    overview: string;
    id: number;
    poster_path: string | null;
    season_number: number;
  } | null | undefined;
  isLoadingSeasonDetails?: boolean;
}

function TVSeasonsSection({
  seasons,
  selectedSeason,
  onSeasonSelect,
  seasonDetails,
  isLoadingSeasonDetails = false,
}: TVSeasonsSectionProps) {
  // Filter out season 0 (specials)
  const regularSeasons = seasons.filter((s) => s.season_number > 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Seasons & Episodes</h3>
      
      {/* Season Selector */}
      <div className="flex flex-wrap gap-2">
        {regularSeasons.map((season) => (
          <button
            key={season.id}
            onClick={() => onSeasonSelect(season.season_number)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              selectedSeason === season.season_number
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {season.name || `Season ${season.season_number}`}
          </button>
        ))}
      </div>

      {/* Episodes Table */}
      {selectedSeason !== null && (
        <div className="mt-6">
          {isLoadingSeasonDetails ? (
            <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
              Loading episodes...
            </div>
          ) : seasonDetails && seasonDetails.episodes && seasonDetails.episodes.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      #
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[300px]">
                      Title
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Air Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Runtime
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {seasonDetails.episodes.map((episode) => (
                    <tr
                      key={episode.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-muted-foreground">
                        {episode.episode_number}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {episode.still_path ? (
                            <div className="relative w-20 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                              <Image
                                src={getPosterUrl(episode.still_path, "w300")}
                                alt={episode.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-12 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">No Image</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                              {episode.name}
                            </p>
                            {episode.overview && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {episode.overview}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {episode.air_date
                          ? new Date(episode.air_date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "TBA"}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {episode.runtime ? `${episode.runtime} min` : "N/A"}
                      </td>
                      <td className="px-4 py-4">
                        {episode.vote_average > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-medium">{episode.vote_average.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          ) : (
            <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
              No episodes available for this season.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

