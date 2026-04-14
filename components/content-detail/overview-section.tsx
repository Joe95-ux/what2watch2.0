"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TMDBMovie, TMDBSeries, getPosterUrl } from "@/lib/tmdb";
import { JustWatchAvailabilityResponse } from "@/lib/justwatch";
import { createPersonSlug } from "@/lib/person-utils";
import { useOMDBData } from "@/hooks/use-content-details";
import { useState, useCallback, useEffect } from "react";
import { ChevronDown, ChevronUp, ChevronRight, Star, Check, Loader2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AwardsSection from "./awards-section";
import { RatingsRow } from "./ratings-row";
import WhyToWatchSection from "./why-to-watch-section";
import { Button } from "@/components/ui/button";
import { useSeenEpisodes, useToggleEpisodeSeen, useMarkSeasonsSeen, useUnmarkSeasonsSeen } from "@/hooks/use-episode-tracking";
import { useUser } from "@clerk/nextjs";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { hasActiveProSubscription } from "@/lib/subscription";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "@tanstack/react-query";
import CreateListModal from "@/components/lists/create-list-modal";

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
  const { data: currentUser } = useCurrentUser();
  const hideAds =
    hasActiveProSubscription(currentUser?.stripeSubscriptionStatus) ||
    currentUser?.aiChatMaxQuestions === -1;
  const [isExpanded, setIsExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const synopsis = item.overview || "";
  const shouldTruncate = synopsis.length > MAX_SYNOPSIS_LENGTH;
  const displaySynopsis = shouldTruncate && !isExpanded
    ? synopsis.slice(0, MAX_SYNOPSIS_LENGTH) + "..."
    : synopsis;

  // Fetch OMDB data if IMDb ID is available
  const { data: omdbData } = useOMDBData(details?.imdb_id || null);
  const { isSignedIn } = useUser();

  const {
    data: editorialLists = [],
    isLoading: isEditorialListsLoading,
    isFetching: isEditorialListsFetching,
  } = useQuery({
    queryKey: ["overview-editorial-lists", item.id, type],
    queryFn: async () => {
      const res = await fetch("/api/lists/public?editorialOnly=true&limit=10");
      if (!res.ok) return [];
      const data = await res.json();
      return (data.lists ?? []).slice(0, 3);
    },
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: relatedUserLists = [],
    isLoading: isRelatedUserListsLoading,
    isFetching: isRelatedUserListsFetching,
  } = useQuery({
    queryKey: ["overview-related-user-lists", item.id, type],
    queryFn: async () => {
      const genreIds = (details?.genres || []).map((g) => g.id).join(",");
      const listParams = new URLSearchParams({
        limit: "12",
        editorialOnly: "false",
        tmdbId: String(item.id),
        mediaType: type,
        genreIds,
      });
      const playlistParams = new URLSearchParams({
        limit: "12",
        tmdbId: String(item.id),
        mediaType: type,
        genreIds,
      });
      const [listsRes, playlistsRes] = await Promise.all([
        fetch(`/api/lists/public?${listParams}`),
        fetch(`/api/playlists/public?${playlistParams}`),
      ]);
      const listsJson = listsRes.ok ? await listsRes.json() : { lists: [] };
      const playlistsJson = playlistsRes.ok ? await playlistsRes.json() : { playlists: [] };
      const lists = (listsJson.lists ?? []) as Array<Record<string, unknown> & { id: string; updatedAt: string }>;
      const playlists = (playlistsJson.playlists ?? []) as Array<Record<string, unknown> & { id: string; updatedAt: string }>;
      const merged = [
        ...lists.map((l) => ({ kind: "list" as const, ...l })),
        ...playlists.map((p) => ({ kind: "playlist" as const, ...p })),
      ];
      merged.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      return merged.slice(0, 3);
    },
    staleTime: 1000 * 60 * 3,
    enabled: Boolean(details?.genres && details.genres.length > 0),
  });

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
        <div className="space-y-6 lg:col-span-8">
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
            {/* Ratings - First entry on mobile (sm and below) */}
            <div className="sm:hidden">
              <div className="flex justify-between gap-4 px-0 py-3 text-sm">
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
                />
              </div>
            </div>
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
            {/* Ratings - Hidden on mobile (shown above), visible on sm and up */}
            <div className="hidden sm:flex justify-between gap-4 px-0 py-3 text-sm">
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

          {/* Why to Watch Section */}
          <WhyToWatchSection
            type={type}
            tmdbId={item.id}
            country={watchAvailability?.country}
            seasonNumber={type === "tv" ? selectedSeason : null}
          />

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

        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Editorial Lists</h3>
            <div className="space-y-2">
              {(isEditorialListsLoading || (isEditorialListsFetching && editorialLists.length === 0)) &&
                Array.from({ length: 3 }).map((_, i) => (
                  <CompactListCardSkeleton key={`editorial-skeleton-${i}`} />
                ))}
              {!isEditorialListsLoading &&
                !(isEditorialListsFetching && editorialLists.length === 0) &&
                editorialLists.slice(0, 3).map((list: any) => (
                <CompactListCard key={list.id} list={list} />
              ))}
              {!isEditorialListsLoading &&
                !(isEditorialListsFetching && editorialLists.length === 0) &&
                editorialLists.length === 0 && (
                <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
                  No editorial lists yet.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              {isSignedIn && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-fit rounded-[20px] border-0 bg-transparent hover:bg-muted/60 cursor-pointer"
                  onClick={() => setIsCreateListModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create List
                </Button>
              )}
            </div>

            <div>
              <Link
                href="/lists"
                className="inline-flex items-center gap-0.5 w-fit text-lg font-semibold cursor-pointer group"
              >
                <span className="text-foreground">Related user Lists</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              </Link>
            </div>

            <div className="space-y-2">
              {(isRelatedUserListsLoading || (isRelatedUserListsFetching && relatedUserLists.length === 0)) &&
                Array.from({ length: 3 }).map((_, i) => (
                  <CompactListCardSkeleton key={`related-skeleton-${i}`} />
                ))}
              {!isRelatedUserListsLoading &&
                !(isRelatedUserListsFetching && relatedUserLists.length === 0) &&
                relatedUserLists.map((row: { kind: "list" | "playlist"; id: string }) => (
                  <CompactRelatedCard key={`${row.kind}-${row.id}`} row={row} />
                ))}
              {!isRelatedUserListsLoading &&
                !(isRelatedUserListsFetching && relatedUserLists.length === 0) &&
                relatedUserLists.length === 0 && (
                <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
                  No related lists yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSignedIn && (
        <CreateListModal
          isOpen={isCreateListModalOpen}
          onClose={() => setIsCreateListModalOpen(false)}
          initialItem={{ item, type }}
        />
      )}
    </section>
  );
}

function CompactListCardSkeleton() {
  return (
    <div className="relative flex rounded-lg border border-border overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col p-3 gap-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <div className="w-16 sm:w-20 aspect-[3/4] flex-shrink-0">
        <Skeleton className="h-full w-full rounded-r-lg" />
      </div>
    </div>
  );
}

function CompactListCard({ list }: { list: any }) {
  const router = useRouter();
  const firstWithPoster = (list.items || []).find((x: any) => Boolean(x.posterPath));
  const posterPath = firstWithPoster?.posterPath || null;
  const itemCount = list?._count?.items ?? list?.items?.length ?? 0;
  const updatedAt = list?.updatedAt
    ? new Date(list.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div
      className="relative flex rounded-lg border border-border transition-all group cursor-pointer overflow-hidden"
      onClick={() => router.push(`/lists/${list.id}`)}
    >
      <div className="flex-1 min-w-0 flex flex-col p-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/lists/${list.id}`);
          }}
          className="text-left text-sm font-semibold line-clamp-1 hover:text-primary transition-colors cursor-pointer"
        >
          {list.name}
        </button>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {updatedAt ? `Updated ${updatedAt}` : "Recently updated"} . {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      {posterPath ? (
        <div className="relative w-16 sm:w-20 aspect-[3/4] rounded-r-lg overflow-hidden flex-shrink-0 bg-muted">
          <Image
            src={getPosterUrl(posterPath, "w200")}
            alt={list.name}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-16 sm:w-20 aspect-[3/4] rounded-r-lg bg-muted flex-shrink-0 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">No Image</span>
        </div>
      )}
    </div>
  );
}

function CompactRelatedCard({ row }: { row: Record<string, unknown> & { kind: "list" | "playlist"; id: string; name?: string } }) {
  const router = useRouter();
  const isPlaylist = row.kind === "playlist";
  const href = isPlaylist ? `/playlists/${row.id}` : `/lists/${row.id}`;
  const items = (row.items as Array<{ posterPath?: string | null }> | undefined) ?? [];
  const firstWithPoster = items.find((x) => Boolean(x.posterPath));
  const posterPath = firstWithPoster?.posterPath || null;
  const countList = row._count as { items?: number; youtubeItems?: number } | undefined;
  const itemCount = isPlaylist
    ? (countList?.items ?? 0) + (countList?.youtubeItems ?? 0)
    : countList?.items ?? items.length;
  const updatedAt = row.updatedAt
    ? new Date(row.updatedAt as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const title = (row.name as string) || "Untitled";

  return (
    <div
      className="relative flex rounded-lg border border-border transition-all group cursor-pointer overflow-hidden"
      onClick={() => router.push(href)}
    >
      <div className="flex-1 min-w-0 flex flex-col p-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(href);
          }}
          className="text-left text-sm font-semibold line-clamp-1 hover:text-primary transition-colors cursor-pointer"
        >
          {title}
        </button>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {isPlaylist ? "Playlist · " : "List · "}
          {updatedAt ? `Updated ${updatedAt}` : "Recently updated"} . {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      {posterPath ? (
        <div className="relative w-16 sm:w-20 aspect-[3/4] rounded-r-lg overflow-hidden flex-shrink-0 bg-muted">
          <Image
            src={getPosterUrl(posterPath, "w200")}
            alt={title}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-16 sm:w-20 aspect-[3/4] rounded-r-lg bg-muted flex-shrink-0 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">No Image</span>
        </div>
      )}
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
                className="hover:underline transition-colors cursor-pointer"
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
                className="hover:underline transition-colors cursor-pointer"
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
                className="hover:underline transition-colors cursor-pointer"
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
          className="font-medium text-right hover:underline transition-colors cursor-pointer"
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
    type === "movie" && omdbData?.boxOffice && { label: "Box Office U.S", value: omdbData.boxOffice },
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
  const { openSignIn } = useClerk();
  const isMobile = useIsMobile();
  const { data: seenEpisodes = [] } = useSeenEpisodes(tvShow.id);
  const toggleEpisodeSeen = useToggleEpisodeSeen();
  const markSeasonsSeen = useMarkSeasonsSeen();
  const unmarkSeasonsSeen = useUnmarkSeasonsSeen();
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

  const promptSignIn = (message?: string) => {
    toast.info(message ?? "Please sign in to perform this action.");
    if (openSignIn) {
      openSignIn({
        afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });
    }
  };

  // Filter out season 0 (specials)
  const regularSeasons = seasons.filter((s) => s.season_number > 0);

  // Auto-select first season if none selected
  useEffect(() => {
    if (regularSeasons.length > 0 && selectedSeason === null && onSeasonSelect) {
      onSeasonSelect(regularSeasons[0].season_number);
    }
  }, [regularSeasons, selectedSeason, onSeasonSelect]);

  // Reset showAllEpisodes when season changes
  useEffect(() => {
    setShowAllEpisodes(false);
  }, [selectedSeason]);

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
      promptSignIn("Sign in to track episodes you've watched.");
      return;
    }
    const isSeen = isEpisodeSeen(episode.id);
    // isSeen: true = currently seen (will unmark), false = not seen (will mark)
    await toggleEpisodeSeen.mutateAsync({
      tvShowTmdbId: tvShow.id,
      tvShowTitle: tvShow.name,
      episodeId: episode.id,
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
      isSeen: isSeen, // Pass current state
    });
  };

  const handleToggleSeasonSeenAll = async (checked: boolean) => {
    if (selectedSeason === null) {
      return;
    }
    if (!isSignedIn) {
      promptSignIn("Sign in to track seasons you've watched.");
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
      // Unmark all episodes in the season using the API
      await unmarkSeasonsSeen.mutateAsync({
        tvShowTmdbId: tvShow.id,
        seasonNumbers: [selectedSeason],
      });
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
                  disabled={!isSignedIn || markSeasonsSeen.isPending || unmarkSeasonsSeen.isPending}
                  className="cursor-pointer"
                />
                <Label
                  htmlFor="seen-all-season"
                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                >
                  Seen All
                  {(markSeasonsSeen.isPending || unmarkSeasonsSeen.isPending) && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </Label>
              </div>
              
              {/* Display first 10 episodes or all based on toggle */}
              {(() => {
                const allEpisodes = seasonDetails.episodes;
                const displayedEpisodes = showAllEpisodes ? allEpisodes : allEpisodes.slice(0, 10);
                const hasMoreEpisodes = allEpisodes.length > 10;
                
                return (
                  <>
                    {displayedEpisodes.map((episode) => (
                      <div
                        key={episode.id}
                        className={cn(
                          "relative flex rounded-lg border border-border transition-all group cursor-pointer overflow-hidden",
                          isMobile && "flex-col"
                        )}
                        onClick={(e) => handleEpisodeClick(e, episode)}
                      >
                  {episode.still_path ? (
                    <div className={cn(
                      "relative w-28 sm:w-34 rounded-l-lg overflow-hidden flex-shrink-0 bg-muted",
                      isMobile && "w-full h-[220px] rounded-t-lg rounded-l-none"
                    )}>
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
                    <div className={cn(
                      "w-28 sm:w-34 rounded-l-lg bg-muted flex-shrink-0 flex items-center justify-center",
                      isMobile && "w-full h-[220px] rounded-t-lg rounded-l-none"
                    )}>
                      <span className="text-sm text-muted-foreground">No Image</span>
                    </div>
                  )}

                    <div className={cn(
                      "flex-1 min-w-0 flex flex-col p-6",
                      isMobile && "p-4"
                    )}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          S{episode.season_number.toString().padStart(2, "0")}E{episode.episode_number.toString().padStart(2, "0")}
                        </span>
                        <h3 className="text-lg font-semibold truncate sm:truncate-none">
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

                    {/* Show More/Less Toggle */}
                    {hasMoreEpisodes && (
                      <button
                        onClick={() => setShowAllEpisodes(!showAllEpisodes)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full justify-center py-2"
                      >
                        {showAllEpisodes ? (
                          <>
                            Show Less
                            <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Show More ({allEpisodes.length - 10} more)
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()}
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
