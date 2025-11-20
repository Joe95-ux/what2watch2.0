"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { JustWatchAvailabilityResponse, JustWatchOffer } from "@/lib/justwatch";
import { createPersonSlug } from "@/lib/person-utils";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

  const director = details?.credits?.crew?.find((person) => person.job === "Director");
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
                  className="px-3 py-1 text-sm rounded-full bg-muted text-foreground flex-shrink-0 transition hover:bg-primary/10 cursor-pointer"
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
            <OverviewInfoRow 
              label="Director" 
              value={director?.name || "N/A"} 
              personId={director?.id}
              personName={director?.name}
            />
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
          </div>

          <DetailsGrid type={type} details={details} />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <WatchProvidersSection
            availability={watchAvailability}
            isLoading={isWatchLoading}
          />
          <div className="hidden lg:flex h-52 border border-border rounded-2xl bg-muted/40 items-center justify-center text-sm text-muted-foreground">
            Ad placement
          </div>
        </div>
      </div>
    </section>
  );
}

function WatchProvidersSection({
  availability,
  isLoading,
}: {
  availability?: JustWatchAvailabilityResponse | null;
  isLoading?: boolean;
}) {
  const streamingProviders = availability?.offersByType?.flatrate ?? [];
  const buyProviders = availability?.offersByType?.buy ?? [];
  const rentProviders = availability?.offersByType?.rent ?? [];

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

  if (!availability || (streamingProviders.length === 0 && buyProviders.length === 0 && rentProviders.length === 0)) {
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
        {streamingProviders.length > 0 && (
          <ProviderRow
            title="Streaming"
            accentClass="bg-green-500"
            providers={streamingProviders}
          />
        )}
        {buyProviders.length > 0 && (
          <ProviderRow
            title="Buy"
            accentClass="bg-blue-500"
            providers={buyProviders}
          />
        )}
        {rentProviders.length > 0 && (
          <ProviderRow
            title="Rent"
            accentClass="bg-purple-500"
            providers={rentProviders}
          />
        )}
      </div>

      <JustWatchCredit />
    </div>
  );
}

function ProviderRow({
  title,
  accentClass,
  providers,
}: {
  title: string;
  accentClass: string;
  providers: JustWatchOffer[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-1 h-6 rounded-full ${accentClass}`} />
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {providers.map((provider) => (
          <a
            key={`${provider.providerId}-${provider.monetizationType}`}
            href={provider.deepLinkUrl ?? provider.standardWebUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg border border-border transition-colors group w-fit cursor-pointer"
          >
            {provider.iconUrl ? (
              <Image
                src={provider.iconUrl}
                alt={provider.providerName}
                width={32}
                height={32}
                className="object-contain rounded group-hover:opacity-80 transition-opacity"
                unoptimized
              />
            ) : (
              <span className="text-xs font-medium">{provider.providerName}</span>
            )}
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-foreground">{provider.providerName}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {provider.monetizationType}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function JustWatchCredit() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
      <Image
        src="https://widget.justwatch.com/assets/JW_logo_color_10px.svg"
        alt="JustWatch"
        width={66}
        height={10}
        unoptimized
      />
      <span>Data powered by JustWatch</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

