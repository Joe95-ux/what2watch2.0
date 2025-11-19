"use client";

import Image from "next/image";
import { TMDBMovie, TMDBSeries, getImageUrl, TMDBWatchProvider } from "@/lib/tmdb";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchProviders } from "@/hooks/use-content-details";
import { Skeleton } from "@/components/ui/skeleton";
import LogToDiaryDropdown from "@/components/browse/log-to-diary-dropdown";

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
}

const MAX_SYNOPSIS_LENGTH = 500;

export default function OverviewSection({ item, type, details, cast }: OverviewSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const synopsis = item.overview || "";
  const shouldTruncate = synopsis.length > MAX_SYNOPSIS_LENGTH;
  const displaySynopsis = shouldTruncate && !isExpanded
    ? synopsis.slice(0, MAX_SYNOPSIS_LENGTH) + "..."
    : synopsis;

  const director = details?.credits?.crew?.find((person) => person.job === "Director");
  const writers = details?.credits?.crew
    ?.filter((person) => person.job === "Writer" || person.job === "Screenplay" || person.job === "Story")
    .slice(0, 3)
    .map((person) => person.name)
    .join(", ");
  const topCastNames = cast && cast.length > 0 ? cast.slice(0, 4).map((c) => c.name).join(", ") : "N/A";
  const countries = details?.production_countries?.map((c) => c.name).join(", ") || "N/A";

  return (
    <section className="py-12 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          {details?.genres && details.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {details.genres.map((genre) => (
                <span
                  key={genre.id}
                  className="px-3 py-1 text-sm rounded-full bg-muted text-foreground"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-4">Storyline</h2>
            <p className="text-foreground leading-relaxed text-base">
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
            <OverviewInfoRow label="Director" value={director?.name || "N/A"} />
            <OverviewInfoRow label="Writers" value={writers || "N/A"} />
            <OverviewInfoRow label="Stars" value={topCastNames} />
            <OverviewInfoRow label="Country" value={countries} />
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <LogToDiaryDropdown
            item={item}
            type={type}
            trigger={
              <Button className="w-full" size="lg">
                Log {type === "movie" ? "Movie" : "TV Show"}
              </Button>
            }
          />
          <WatchProvidersSection item={item} type={type} />
        </div>
      </div>

      <DetailsGrid type={type} details={details} />
    </section>
  );
}

function WatchProvidersSection({ item, type }: { item: TMDBMovie | TMDBSeries; type: "movie" | "tv" }) {
  const { data: providersData, isLoading } = useWatchProviders(type, item.id);

  // Get providers for US region (or first available region)
  const usProviders = providersData?.results?.["US"] || providersData?.results?.[Object.keys(providersData?.results || {})[0]] || null;
  
  const streamingProviders = usProviders?.flatrate || [];
  const buyProviders = usProviders?.buy || [];
  const rentProviders = usProviders?.rent || [];

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Where to Watch</h2>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!usProviders || (streamingProviders.length === 0 && buyProviders.length === 0 && rentProviders.length === 0)) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Where to Watch</h2>
        <div className="text-center text-muted-foreground py-8 border border-border rounded-lg">
          <p className="text-sm">Watch provider information not available</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Where to Watch</h2>
      
      <div className="space-y-6">
        {/* Streaming Providers - JustWatch style */}
        {streamingProviders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 bg-green-500 rounded-full" />
              <h3 className="text-base font-semibold text-foreground">Streaming</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {streamingProviders.map((provider: TMDBWatchProvider) => (
                <div
                  key={provider.provider_id}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg border border-border transition-colors cursor-pointer group"
                >
                  {provider.logo_path ? (
                    <Image
                      src={getImageUrl(provider.logo_path, "w500")}
                      alt={provider.provider_name}
                      width={32}
                      height={32}
                      className="object-contain rounded group-hover:opacity-80 transition-opacity"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-medium">{provider.provider_name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buy Providers - JustWatch style */}
        {buyProviders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 bg-blue-500 rounded-full" />
              <h3 className="text-base font-semibold text-foreground">Buy</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {buyProviders.map((provider: TMDBWatchProvider) => (
                <div
                  key={provider.provider_id}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg border border-border transition-colors cursor-pointer group"
                >
                  {provider.logo_path ? (
                    <Image
                      src={getImageUrl(provider.logo_path, "w500")}
                      alt={provider.provider_name}
                      width={32}
                      height={32}
                      className="object-contain rounded group-hover:opacity-80 transition-opacity"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-medium">{provider.provider_name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rent Providers - JustWatch style */}
        {rentProviders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 bg-purple-500 rounded-full" />
              <h3 className="text-base font-semibold text-foreground">Rent</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {rentProviders.map((provider: TMDBWatchProvider) => (
                <div
                  key={provider.provider_id}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg border border-border transition-colors cursor-pointer group"
                >
                  {provider.logo_path ? (
                    <Image
                      src={getImageUrl(provider.logo_path, "w500")}
                      alt={provider.provider_name}
                      width={32}
                      height={32}
                      className="object-contain rounded group-hover:opacity-80 transition-opacity"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-medium">{provider.provider_name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsGrid({ type, details }: { type: "movie" | "tv"; details: DetailsType | null }) {
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

  const detailItems: Array<{ label: string; value: string }> = [
    releaseDate && { label: type === "movie" ? "Release Date" : "First Air Date", value: releaseDate },
    runtime && { label: type === "movie" ? "Runtime" : "Episode Runtime", value: runtime },
    { label: "Country", value: country },
    { label: "Language", value: language },
    { label: "Status", value: status },
    budget && { label: "Budget", value: budget },
    revenue && { label: "Revenue", value: revenue },
    seasons && { label: "Seasons", value: seasons.toString() },
    episodes && { label: "Episodes", value: episodes.toString() },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {detailItems.map((item, index) => (
          <div key={index}>
            <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
            <p className="font-medium">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

