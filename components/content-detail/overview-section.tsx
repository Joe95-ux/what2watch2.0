"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { JustWatchAvailabilityResponse, JustWatchOffer } from "@/lib/justwatch";
import type { JustWatchCountry } from "@/lib/justwatch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPersonSlug } from "@/lib/person-utils";
import { useOMDBData } from "@/hooks/use-content-details";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AwardsSection from "./awards-section";
import { RatingsRow } from "./ratings-row";
import { Button } from "@/components/ui/button";

interface DetailsType {
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages?: Array<{ english_name: string; iso_639_1: string; name: string }>;
  status?: string;
  budget?: number;
  revenue?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: Array<{ id: number; name: string }>;
  imdb_id?: string;
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
}

const MAX_SYNOPSIS_LENGTH = 500;

export default function OverviewSection({
  item,
  type,
  details,
  cast,
  watchAvailability,
  isWatchLoading = false,
}: OverviewSectionProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
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
        <div className="lg:col-span-7 space-y-6">
          {details?.genres && details.genres.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2">
              {details.genres.map((genre) => (
                <button
                  type="button"
                  key={genre.id}
                  onClick={() =>
                    router.push(
                      `/search?${new URLSearchParams({
                        type,
                        genre: genre.id.toString(),
                      }).toString()}`
                    )
                  }
                  className="px-3 py-2 text-sm rounded-full bg-muted text-foreground flex-shrink-0 transition hover:bg-primary/10 cursor-pointer"
                >
                  {genre.name}
                </button>
              ))}
            </div>
          )}

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

          <div className="rounded-2xl border border-border bg-card/50 divide-y divide-border">
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
            <OverviewInfoRow 
              label="Writers" 
              value={writers ? writers.map((w) => w.name).join(", ") : "N/A"}
              writers={writers}
            />
            <OverviewInfoRow 
              label="Stars" 
              value={topCast.length > 0 ? topCast.map((c) => c.name).join(", ") : "N/A"}
              cast={topCast}
            />
            <OverviewInfoRow label="Country" value={countries} />
            {/* Ratings Row - show in table for both movies and TV: rank | imdb | year */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Ratings</span>
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
          </div>

          {/* Awards Section */}
          {type === "movie" && omdbData?.awards && (
            <AwardsSection awards={omdbData.awards} />
          )}

          <DetailsGrid type={type} details={details} omdbData={omdbData} />
        </div>

        <div className="lg:col-span-5">
          <div className="hidden lg:flex min-h-[420px] border border-border rounded-2xl bg-muted/40 items-center justify-center text-sm text-muted-foreground">
            Ad placement
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailsGrid({ 
  type, 
  details,
  omdbData,
}: { 
  type: "movie" | "tv"; 
  details: DetailsType | null;
  omdbData?: {
    rated?: string | null;
    boxOffice?: string | null;
    production?: string | null;
    dvd?: string | null;
    website?: string | null;
  } | null;
}) {
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatRuntime = (minutes: number | number[] | undefined): string => {
    if (!minutes) return "N/A";
    if (Array.isArray(minutes)) {
      return `${minutes[0]} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const releaseDate = type === "movie"
    ? (details?.release_date ? formatDate(details.release_date) : null)
    : (details?.first_air_date ? formatDate(details.first_air_date) : null);

  const runtime = type === "movie"
    ? (details?.runtime ? formatRuntime(details.runtime) : null)
    : (details?.episode_run_time?.[0] ? formatRuntime(details.episode_run_time[0]) : null);

  const country = details?.production_countries?.[0]?.name || "N/A";
  const language = details?.spoken_languages?.[0]?.english_name || "N/A";
  const status = details?.status || "N/A";
  const budget = type === "movie" && details?.budget ? `$${(details.budget / 1000000).toFixed(1)}M` : null;
  const revenue = type === "movie" && details?.revenue ? `$${(details.revenue / 1000000).toFixed(1)}M` : null;
  const seasons = type === "tv" && details?.number_of_seasons ? details.number_of_seasons : null;
  const episodes = type === "tv" && details?.number_of_episodes ? details.number_of_episodes : null;

  const formatOMDBDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr || dateStr === "N/A") return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  const detailItems: Array<{ label: string; value: string; link?: string }> = [
    releaseDate && { label: type === "movie" ? "Release Date" : "First Air Date", value: releaseDate },
    runtime && { label: type === "movie" ? "Runtime" : "Episode Runtime", value: runtime },
    { label: "Country", value: country },
    { label: "Language", value: language },
    { label: "Status", value: status },
    // OMDB data (movies only)
    type === "movie" && omdbData?.rated && { label: "Rated", value: omdbData.rated },
    type === "movie" && omdbData?.boxOffice && { label: "Box Office", value: omdbData.boxOffice },
    type === "movie" && omdbData?.production && { label: "Production", value: omdbData.production },
    type === "movie" && omdbData?.dvd && formatOMDBDate(omdbData.dvd) && { label: "DVD Release", value: formatOMDBDate(omdbData.dvd)! },
    type === "movie" && omdbData?.website && { label: "Website", value: "Official Site", link: omdbData.website },
    // TMDB data
    budget && { label: "Budget", value: budget },
    revenue && { label: "Revenue", value: revenue },
    seasons && { label: "Seasons", value: seasons.toString() },
    episodes && { label: "Episodes", value: episodes.toString() },
  ].filter((item): item is { label: string; value: string; link?: string } => Boolean(item));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {detailItems.map((item, index) => (
          <div key={index}>
            <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline cursor-pointer"
              >
                {item.value}
              </a>
            ) : (
              <p className="font-medium">{item.value}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface OverviewInfoRowProps {
  label: string;
  value: string;
  personId?: number;
  personName?: string;
  writers?: Array<{ id: number; name: string }>;
  cast?: Array<{ id: number; name: string }>;
}

function OverviewInfoRow({ label, value, personId, personName, writers, cast }: OverviewInfoRowProps) {
  const router = useRouter();

  const handleClick = () => {
    if (personId && personName) {
      router.push(`/person/${createPersonSlug(personId, personName)}`);
    }
  };

  const renderValue = () => {
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
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {renderValue()}
    </div>
  );
}

