"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries, getPosterUrl } from "@/lib/tmdb";
import { JustWatchAvailabilityResponse } from "@/lib/justwatch";
import { createPersonSlug } from "@/lib/person-utils";
import { useOMDBData } from "@/hooks/use-content-details";
import { useState, useCallback, useEffect } from "react";
import { ChevronDown, ChevronUp, Star, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AwardsSection from "./awards-section";
import { RatingsRow } from "./ratings-row";
import { Button } from "@/components/ui/button";
import { useSeenEpisodes, useToggleEpisodeSeen, useMarkSeasonsSeen } from "@/hooks/use-episode-tracking";
import { useUser } from "@clerk/nextjs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DetailsType {
  release_date?: string;
  first_air_date?: string;
  last_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  production_companies?: Array<{ id: number; name: string; logo_path?: string | null }>;
  spoken_languages?: Array<{ english_name: string; iso_639_1: string; name: string }>;
  status?: string;
  budget?: number;
  revenue?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: Array<{ id: number; name: string }>;
  imdb_id?: string;
  homepage?: string | null;
  external_ids?: {
    imdb_id?: string | null;
    facebook_id?: string | null;
    instagram_id?: string | null;
    twitter_id?: string | null;
  };
  networks?: Array<{ id: number; name: string; logo_path?: string | null }>;
  created_by?: Array<{ id: number; name: string; profile_path?: string | null }>;
  credits?: {
    crew?: Array<{
      id: number;
      name: string;
      job: string;
    }>;
  };
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface OverviewSectionProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  details: DetailsType | null;
  cast?: CastMember[];
  watchAvailability?: JustWatchAvailabilityResponse | null;
  isWatchLoading?: boolean;
  // TV Seasons props
  seasons?: Array<{
    id: number;
    name: string;
    overview: string;
    season_number: number;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
  }>;
  selectedSeason?: number | null;
  onSeasonSelect?: (seasonNumber: number) => void;
  seasonDetails?: {
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
  } | null;
  isLoadingSeasonDetails?: boolean;
  tvShowDetails?: {
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
  } | null;
  trailer?: { id: string; key: string; name: string; site: string; type: string } | null;
  onEpisodeClick?: (episode: {
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
  }) => void;
}

const MAX_SYNOPSIS_LENGTH = 500;

export default function OverviewSection({
  item,
  type,
  details,
  cast,
  watchAvailability,
  isWatchLoading = false,
  seasons,
  selectedSeason,
  onSeasonSelect,
  seasonDetails,
  isLoadingSeasonDetails = false,
  tvShowDetails,
  trailer,
  onEpisodeClick,
}: OverviewSectionProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const synopsis = item.overview || "";
  const shouldTruncate = synopsis.length > MAX_SYNOPSIS_LENGTH;
  const displaySynopsis = shouldTruncate && !isExpanded
    ? synopsis.slice(0, MAX_SYNOPSIS_LENGTH) + "..."
    : synopsis;

  // Fetch OMDB data if IMDb ID is available
  const { data: omdbData } = useOMDBData(details?.imdb_id || null);

  // Get director (for movies) or creators (for TV)
  const director = type === "movie" 
    ? details?.credits?.crew?.find((person) => person.job === "Director")
    : null;
  const creators = type === "tv" 
    ? details?.created_by
    : null;
  const writers = details?.credits?.crew
    ?.filter((person) => person.job === "Writer" || person.job === "Screenplay" || person.job === "Story")
    .slice(0, 3);
  const topCast = cast && cast.length > 0 ? cast.slice(0, 4) : [];
  const countries = details?.production_countries?.map((c) => c.name).join(", ") || "N/A";

  return (
    <section className="py-12 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Storyline</h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              {displaySynopsis || "No synopsis available."}
            </p>
            {shouldTruncate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-4"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Read More
                  </>
                )}
              </Button>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-4">
            {type === "movie" ? "Movie Details" : "TV Show Details"}
          </h2>
          <div className="divide-y divide-border">
            {details?.genres && details.genres.length > 0 && (
              <OverviewInfoRow
                label="Genre"
                value=""
                genres={details.genres}
                type={type}
              />
            )}
            {type === "movie" ? (
              <OverviewInfoRow 
                label="Director" 
                value={director?.name || "N/A"} 
                personId={director?.id}
                personName={director?.name}
              />
            ) : (
              <OverviewInfoRow 
                label="Creators" 
                value={creators && creators.length > 0 
                  ? creators.map((c) => c.name).join(", ")
                  : "N/A"
                }
                writers={creators?.map((c) => ({ id: c.id, name: c.name }))}
              />
            )}
            {type === "movie" && (
              <OverviewInfoRow 
                label="Writers" 
                value={writers ? writers.map((w) => w.name).join(", ") : "N/A"}
                writers={writers}
              />
            )}
            <OverviewInfoRow 
              label="Stars" 
              value={topCast.length > 0 ? topCast.map((c) => c.name).join(", ") : "N/A"}
              cast={topCast}
            />
            <OverviewInfoRow label="Production Country" value={countries} />
            <div className="flex items-center justify-between gap-4 px-0 py-3 text-sm">
              <span className="text-muted-foreground uppercase">Ratings</span>
              <RatingsRow
                justwatchRanks={watchAvailability?.ranks ?? null}
                justwatchRank={
                  watchAvailability?.ranks?.["7d"]?.rank ??
                  watchAvailability?.ranks?.["30d"]?.rank ??
                  watchAvailability?.ranks?.["1d"]?.rank ??
                  null
                }
                justwatchRankUrl={
                  watchAvailability?.fullPath
                    ? `https://www.justwatch.com${watchAvailability.fullPath}`
                    : null
                }
                imdbRating={omdbData?.imdbRating || null}
                imdbVotes={omdbData?.imdbVotes || null}
                metascore={omdbData?.metascore || null}
                rottenTomatoes={omdbData?.rottenTomatoes || null}
                tmdbRating={item.vote_average > 0 ? item.vote_average : null}
                year={
                  details?.release_date || details?.first_air_date
                    ? new Date(
                        (details.release_date || details.first_air_date) ?? ""
                      ).getFullYear()
                    : null
                }
              />
            </div>
            {!detailsExpanded ? (
              <div className="px-0 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailsExpanded(true)}
                  className="text-primary cursor-pointer"
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show more
                </Button>
              </div>
            ) : (
              <>
                <OverviewDetailsRows type={type} details={details} omdbData={omdbData} item={item} />
                <div className="px-0 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailsExpanded(false)}
                    className="text-primary cursor-pointer"
                  >
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show less
                  </Button>
                </div>
              </>
            )}
          </div>

          {type === "movie" && omdbData?.awards && (
            <AwardsSection awards={omdbData.awards} />
          )}

          {/* TV Seasons & Episodes - Inside left column */}
          {type === "tv" && seasons && (
            <TVSeasonsContent
              seasons={seasons}
              selectedSeason={selectedSeason}
              onSeasonSelect={onSeasonSelect}
              seasonDetails={seasonDetails}
              isLoadingSeasonDetails={isLoadingSeasonDetails}
              tvShow={item as TMDBSeries}
              tvShowDetails={tvShowDetails}
              trailer={trailer}
              onEpisodeClick={onEpisodeClick}
            />
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="flex min-h-[420px] border border-border rounded-2xl bg-muted/40 items-center justify-center text-sm text-muted-foreground">
            Ad placement
          </div>
          <div className="hidden lg:flex min-h-[420px] border border-border rounded-2xl bg-muted/40 items-center justify-center text-sm text-muted-foreground">
            Ad placement
          </div>
        </div>
      </div>
    </section>
  );
}

interface OverviewInfoRowProps {
  label: string;
  value: string;
  personId?: number;
  personName?: string;
  writers?: Array<{ id: number; name: string }>;
  cast?: Array<{ id: number; name: string }>;
  genres?: Array<{ id: number; name: string }>;
  type?: "movie" | "tv";
}

function OverviewInfoRow({ label, value, personId, personName, writers, cast, genres, type: mediaType }: OverviewInfoRowProps) {
  const router = useRouter();

  const handleClick = () => {
    if (personId && personName) {
      router.push(`/person/${createPersonSlug(personId, personName)}`);
    }
  };

  const renderValue = () => {
    if (genres && genres.length > 0 && mediaType) {
      return (
        <div className="font-medium text-right flex flex-wrap gap-1 justify-end">
          {genres.map((genre, index) => (
            <span key={genre.id}>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/search?${new URLSearchParams({ type: mediaType, genre: genre.id.toString() }).toString()}`
                  )
                }
                className="hover:text-primary transition-colors cursor-pointer"
              >
                {genre.name}
              </button>
              {index < genres.length - 1 && <span>, </span>}
            </span>
          ))}
        </div>
      );
    }

    if (cast && cast.length > 0) {
      return (
        <div className="font-medium text-right flex flex-wrap gap-1 justify-end">
          {cast.map((person, index) => (
            <span key={person.id}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/person/${createPersonSlug(person.id, person.name)}`);
                }}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                {person.name}
              </button>
              {index < cast.length - 1 && <span>,</span>}
            </span>
          ))}
        </div>
      );
    }

    if (writers && writers.length > 0) {
      return (
        <div className="font-medium text-right flex flex-wrap gap-1 justify-end">
          {writers.map((writer, index) => (
            <span key={writer.id}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/person/${createPersonSlug(writer.id, writer.name)}`);
                }}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                {writer.name}
              </button>
              {index < writers.length - 1 && <span>,</span>}
            </span>
          ))}
        </div>
      );
    }

    if (personId && value !== "N/A") {
      return (
        <button
          onClick={handleClick}
          className="font-medium text-right hover:text-primary transition-colors cursor-pointer"
        >
          {value}
        </button>
      );
    }

    return <span className="font-medium text-right">{value}</span>;
  };

  return (
    <div className="flex items-center justify-between gap-4 px-0 py-3 text-sm">
      <span className="text-muted-foreground uppercase">{label}</span>
      {renderValue()}
    </div>
  );
}

function OverviewDetailsRows({
  type,
  details,
  omdbData,
  item,
}: {
  type: "movie" | "tv";
  details: DetailsType | null;
  omdbData?: { rated?: string | null; boxOffice?: string | null; production?: string | null; dvd?: string | null; website?: string | null } | null;
  item: TMDBMovie | TMDBSeries;
}) {
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };
  const formatRuntime = (minutes: number | number[] | undefined): string => {
    if (!minutes) return "N/A";
    if (Array.isArray(minutes)) return `${minutes[0]} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };
  const formatOMDBDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr || dateStr === "N/A") return null;
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return null;
    }
  };

  const releaseDate = type === "movie"
    ? (details?.release_date ? formatDate(details.release_date) : null)
    : (details?.first_air_date ? formatDate(details.first_air_date) : null);
  const lastAirDate = type === "tv" && details?.last_air_date ? formatDate(details.last_air_date) : null;
  const runtime = type === "movie"
    ? (details?.runtime ? formatRuntime(details.runtime) : null)
    : (details?.episode_run_time?.[0] ? formatRuntime(details.episode_run_time[0]) : null);
  const language =
    details?.spoken_languages?.[0]?.english_name ||
    details?.spoken_languages?.[0]?.name ||
    "N/A";
  const status = details?.status || "N/A";
  const budget = type === "movie" && details?.budget ? `$${(details.budget / 1000000).toFixed(1)}M` : null;
  const revenue =
    type === "movie" && details?.revenue != null && details.revenue > 0
      ? `$${details.revenue.toLocaleString()} (Worldwide)`
      : null;
  const seasons = type === "tv" && details?.number_of_seasons != null ? details.number_of_seasons : null;
  const episodes = type === "tv" && details?.number_of_episodes != null ? details.number_of_episodes : null;
  const networks = type === "tv" && details?.networks?.length ? details.networks.map((n) => n.name).join(", ") : null;
  const productionCompanies = details?.production_companies?.length
    ? details.production_companies.map((p) => p.name).join(", ")
    : null;

  const ext = details?.external_ids;
  const imdbId = details?.imdb_id ?? ext?.imdb_id;
  const title = type === "movie" ? (item as TMDBMovie).title : (item as TMDBSeries).name;
  const hasWebLinks =
    details?.homepage ||
    (imdbId && `https://www.imdb.com/title/${imdbId}`) ||
    ext?.facebook_id ||
    ext?.instagram_id ||
    ext?.twitter_id;

  const rows: Array<{ label: string; value: string; link?: string }> = [
    releaseDate && { label: type === "movie" ? "Release Date" : "First Air Date", value: releaseDate },
    lastAirDate && { label: "Last Air Date", value: lastAirDate },
    runtime && { label: type === "movie" ? "Runtime" : "Episode Runtime", value: runtime },
    { label: "Original Language", value: language },
    { label: "Status", value: status },
    networks && { label: "Network", value: networks },
    productionCompanies && { label: "Production Companies", value: productionCompanies },
    type === "movie" && omdbData?.rated && { label: "Rated", value: omdbData.rated },
    type === "movie" && omdbData?.boxOffice && { label: "Box Office", value: omdbData.boxOffice },
    type === "movie" && omdbData?.production && { label: "Production", value: omdbData.production },
    type === "movie" && omdbData?.dvd && formatOMDBDate(omdbData.dvd) && { label: "DVD Release", value: formatOMDBDate(omdbData.dvd)! },
    budget && { label: "Budget", value: budget },
    revenue && { label: "Box Office Gross", value: revenue },
    seasons != null && { label: "Seasons", value: String(seasons) },
    episodes != null && { label: "Episodes", value: String(episodes) },
  ].filter((r): r is { label: string; value: string; link?: string } => Boolean(r));

  return (
    <>
      {rows.map((row, index) => (
        <div key={index} className="flex items-center justify-between gap-4 px-0 py-3 text-sm">
          <span className="text-muted-foreground uppercase">{row.label}</span>
          {row.link ? (
            <a href={row.link} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
              {row.value}
            </a>
          ) : (
            <span className="font-medium text-right">{row.value}</span>
          )}
        </div>
      ))}
      {hasWebLinks && (
        <div className="flex items-center justify-between gap-4 px-0 py-3 text-sm">
          <span className="text-muted-foreground uppercase">{title} on the web</span>
          <div className="font-medium text-right flex flex-wrap gap-x-3 gap-y-1 justify-end">
            {details?.homepage && (
              <a href={details.homepage} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Official website
              </a>
            )}
            {imdbId && (
              <a href={`https://www.imdb.com/title/${imdbId}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                IMDb
              </a>
            )}
            {ext?.facebook_id && (
              <a href={`https://www.facebook.com/${ext.facebook_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Facebook
              </a>
            )}
            {ext?.instagram_id && (
              <a href={`https://www.instagram.com/${ext.instagram_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Instagram
              </a>
            )}
            {ext?.twitter_id && (
              <a href={`https://twitter.com/${ext.twitter_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                X (Twitter)
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// TV Seasons Content Component
function TVSeasonsContent({
  seasons,
  selectedSeason,
  onSeasonSelect,
  seasonDetails,
  isLoadingSeasonDetails = false,
  tvShow,
  tvShowDetails,
  trailer,
  onEpisodeClick,
}: {
  seasons: Array<{
    id: number;
    name: string;
    overview: string;
    season_number: number;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
  }>;
  selectedSeason?: number | null;
  onSeasonSelect?: (seasonNumber: number) => void;
  seasonDetails?: {
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
  } | null;
  isLoadingSeasonDetails?: boolean;
  tvShow: TMDBSeries;
  tvShowDetails?: {
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
  } | null;
  trailer?: { id: string; key: string; name: string; site: string; type: string } | null;
  onEpisodeClick?: (episode: {
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
  }) => void;
}) {
  const { isSignedIn } = useUser();
  const { data: seenEpisodes = [] } = useSeenEpisodes(tvShow.id);
  const toggleEpisodeSeen = useToggleEpisodeSeen();
  const markSeasonsSeen = useMarkSeasonsSeen();

  // Filter out season 0 (specials)
  const regularSeasons = seasons.filter((s) => s.season_number > 0);

  // Auto-select first season if none selected
  useEffect(() => {
    if (regularSeasons.length > 0 && selectedSeason === null && onSeasonSelect) {
      onSeasonSelect(regularSeasons[0].season_number);
    }
  }, [regularSeasons, selectedSeason, onSeasonSelect]);

  const isEpisodeSeen = (episodeId: number) => {
    return seenEpisodes.includes(episodeId);
  };

  // Check if all episodes in the current season are seen
  const areAllSeasonEpisodesSeen = () => {
    if (!seasonDetails || !seasonDetails.episodes || selectedSeason === null) {
      return false;
    }
    return seasonDetails.episodes.every((episode) => isEpisodeSeen(episode.id));
  };

  const handleToggleEpisodeSeen = async (episode: {
    id: number;
    season_number: number;
    episode_number: number;
  }) => {
    if (!isSignedIn) {
      return;
    }
    const isSeen = isEpisodeSeen(episode.id);
    await toggleEpisodeSeen.mutateAsync({
      tvShowTmdbId: tvShow.id,
      tvShowTitle: tvShow.name,
      episodeId: episode.id,
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
      isSeen: !isSeen,
    });
  };

  const handleToggleSeasonSeenAll = async (checked: boolean) => {
    if (!isSignedIn || selectedSeason === null) {
      return;
    }
    
    if (checked) {
      // Mark all episodes in the season as seen
      await markSeasonsSeen.mutateAsync({
        tvShowTmdbId: tvShow.id,
        tvShowTitle: tvShow.name,
        seasonNumbers: [selectedSeason],
      });
    } else {
      // Unmark all episodes in the season
      if (seasonDetails && seasonDetails.episodes) {
        // Unmark each episode individually
        for (const episode of seasonDetails.episodes) {
          if (isEpisodeSeen(episode.id)) {
            await toggleEpisodeSeen.mutateAsync({
              tvShowTmdbId: tvShow.id,
              tvShowTitle: tvShow.name,
              episodeId: episode.id,
              seasonNumber: episode.season_number,
              episodeNumber: episode.episode_number,
              isSeen: false,
            });
          }
        }
      }
    }
  };

  const handleSeasonSelect = useCallback((e: React.MouseEvent, seasonNumber: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSeasonSelect) {
      onSeasonSelect(seasonNumber);
    }
  }, [onSeasonSelect]);

  const handleEpisodeClick = useCallback((e: React.MouseEvent, episode: {
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
  }) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEpisodeClick) {
      onEpisodeClick(episode);
    }
  }, [onEpisodeClick]);

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-2xl font-bold">Seasons & Episodes</h2>

      {/* Season Selector - Carousel */}
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 3,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 2 },
              "(max-width: 1024px)": { slidesToScroll: 3 },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 gap-2">
            {regularSeasons.map((season) => (
              <CarouselItem key={season.id} className="pl-2 basis-auto">
                <button
                  onClick={(e) => handleSeasonSelect(e, season.season_number)}
                  className={cn(
                    "relative py-4 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                    selectedSeason === season.season_number
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {season.name || `Season ${season.season_number}`}
                  {selectedSeason === season.season_number && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious 
            className="left-0 h-[42px] w-[45px] rounded-l-md rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
          <CarouselNext 
            className="right-0 h-[42px] w-[45px] rounded-r-md rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
        </Carousel>
      </div>

      {/* Episodes - Card Design */}
      {selectedSeason !== null && (
        <div className="space-y-4">
          {isLoadingSeasonDetails ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : seasonDetails && seasonDetails.episodes && seasonDetails.episodes.length > 0 ? (
            <div className="space-y-4">
              {/* Seen All Checkbox */}
              <div className="flex items-center space-x-2 pb-2">
                <Checkbox
                  id="seen-all-season"
                  checked={areAllSeasonEpisodesSeen()}
                  onCheckedChange={handleToggleSeasonSeenAll}
                  disabled={!isSignedIn || markSeasonsSeen.isPending || toggleEpisodeSeen.isPending}
                  className="cursor-pointer"
                />
                <Label
                  htmlFor="seen-all-season"
                  className="text-sm font-medium cursor-pointer"
                >
                  Seen All
                </Label>
              </div>
              
              {seasonDetails.episodes.map((episode) => (
                <div
                  key={episode.id}
                  className="relative flex rounded-lg border border-border transition-all group cursor-pointer hover:border-primary/50 overflow-hidden"
                  onClick={(e) => handleEpisodeClick(e, episode)}
                >
                  {episode.still_path ? (
                    <div className="relative w-28 sm:w-34 rounded-l-lg overflow-hidden flex-shrink-0 bg-muted">
                      <Image
                        src={getPosterUrl(episode.still_path, "w300")}
                        alt={episode.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-28 sm:w-34 rounded-l-lg bg-muted flex-shrink-0 flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">No Image</span>
                    </div>
                  )}

                    <div className="flex-1 min-w-0 flex flex-col p-6">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          S{episode.season_number.toString().padStart(2, "0")}E{episode.episode_number.toString().padStart(2, "0")}
                        </span>
                        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors truncate sm:truncate-none">
                          {episode.name}
                        </h3>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleEpisodeSeen(episode);
                              }}
                              disabled={!isSignedIn || toggleEpisodeSeen.isPending}
                              className="ml-auto flex-shrink-0 h-6 w-6 rounded-full border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check className={cn("h-4 w-4 font-bold", isEpisodeSeen(episode.id) ? "text-green-500" : "text-muted-foreground")} strokeWidth={3} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isEpisodeSeen(episode.id) ? "Mark as not seen" : "Mark as seen"}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                        {episode.air_date && (
                          <span>{new Date(episode.air_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                        )}
                        {episode.runtime && (
                          <>
                            {episode.air_date && <span>•</span>}
                            <span>{episode.runtime} min</span>
                          </>
                        )}
                        {episode.vote_average > 0 && (
                          <>
                            {(episode.air_date || episode.runtime) && <span>•</span>}
                            <div className="flex items-center gap-1.5">
                              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                              <span className="font-semibold">{episode.vote_average.toFixed(1)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {episode.overview && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {episode.overview}
                        </p>
                      )}
                    </div>
                  </div>
                

              ))}
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
