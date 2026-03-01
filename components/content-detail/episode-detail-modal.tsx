"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, Tv } from "lucide-react";
import { FaBookmark, FaPlay } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { TMDBSeries, TMDBVideo, getPosterUrl } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IMDBBadge } from "@/components/ui/imdb-badge";
import TrailerModal from "@/components/browse/trailer-modal";
import { format } from "date-fns";
import { createPersonSlug } from "@/lib/person-utils";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import { useSeasonWatchProviders } from "@/hooks/use-content-details";
import { toast } from "sonner";
import type { JustWatchAvailabilityResponse, JustWatchOffer } from "@/lib/justwatch";
import { List, Table2 } from "lucide-react";
import WatchListView from "./watch-list-view";

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

const MODAL_WATCH_SECTIONS: Array<{
  key: keyof JustWatchAvailabilityResponse["offersByType"];
  title: string;
  description: string;
  ctaLabel: string;
}> = [
  { key: "flatrate", title: "Streaming", description: "Included with subscription", ctaLabel: "Watch Now" },
  { key: "ads", title: "With Ads", description: "Free with ads", ctaLabel: "Watch Free" },
  { key: "free", title: "Free to Watch", description: "Completely free sources", ctaLabel: "Start Watching" },
  { key: "cinema", title: "In theaters", description: "Watch in cinema", ctaLabel: "Find showtimes" },
  { key: "rent", title: "Rent", description: "Pay once, limited time access", ctaLabel: "Rent" },
  { key: "buy", title: "Buy", description: "Purchase to own", ctaLabel: "Buy" },
];

function ViewSwitcher({
  viewMode,
  onViewModeChange,
}: {
  viewMode: "table" | "list";
  onViewModeChange: (mode: "table" | "list") => void;
}) {
  return (
    <div className="flex items-center gap-1 border border-border rounded-md p-1 bg-background">
      <Button
        variant={viewMode === "table" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewModeChange("table")}
        className={cn(
          "h-8 px-3 cursor-pointer",
          viewMode === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        )}
      >
        <Table2 className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewModeChange("list")}
        className={cn(
          "h-8 px-3 cursor-pointer",
          viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        )}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}

function EpisodeModalWhereToWatch({
  seasonNumber,
  availability,
  fallbackAvailability,
  isLoading,
}: {
  seasonNumber: number;
  availability: JustWatchAvailabilityResponse | null;
  fallbackAvailability?: JustWatchAvailabilityResponse | null;
  isLoading: boolean;
}) {
  // Filter state - "all" selected by default
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  // Quality filter state - only used in list view
  const [selectedQuality, setSelectedQuality] = useState<string>("all");
  // View mode state - "table" is default
  const [viewMode, setViewMode] = useState<"table" | "list">("table");

  // Helper function to extract quality from presentationType
  const getQuality = (presentationType: string | null | undefined): string => {
    if (!presentationType) return "";
    const quality = presentationType.toLowerCase();
    // Check for highest quality first (order matters to avoid false positives)
    if (quality.includes("4k") || quality.includes("uhd")) return "4K";
    if (quality.includes("hd") && !quality.includes("uhd")) return "HD"; // Explicitly exclude "uhd"
    if (quality.includes("sd")) return "SD";
    return "";
  };

  const handleFilterClick = (key: string) => {
    setSelectedFilter(key);
  };

  const handleQualityClick = (quality: string) => {
    setSelectedQuality(quality);
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading availability for Season {seasonNumber}…
      </div>
    );
  }
  const data = availability ?? fallbackAvailability ?? null;
  if (!data) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No availability data for Season {seasonNumber} right now.
      </div>
    );
  }
  const hasOffers = (data.allOffers?.length ?? 0) > 0;
  const isFallback = !availability && fallbackAvailability;
  if (!hasOffers) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No offers found for Season {seasonNumber}.
      </div>
    );
  }

  // Get sections that have offers
  const sectionsWithOffers = MODAL_WATCH_SECTIONS.filter(section => {
    const offers = data.offersByType[section.key] || [];
    return offers.length > 0;
  });

  // Filter sections based on selected filter
  const filteredSections = selectedFilter === "all"
    ? sectionsWithOffers
    : sectionsWithOffers.filter(section => section.key === selectedFilter);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between gap-3">
        {isFallback ? (
          <p className="text-sm text-muted-foreground">
            Showing availability for the series.
          </p>
        ) : (
          <h4 className="text-lg font-semibold">Season {seasonNumber}</h4>
        )}
        <ViewSwitcher viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>
      
      {/* Filter Row - Show quality filters in list view, type filters in table view */}
      {viewMode === "list" ? (
        (() => {
          // Extract unique qualities from all offers
          const allOffers = data.allOffers || [];
          const qualities = new Set<string>();
          allOffers.forEach((offer) => {
            const quality = getQuality(offer.presentationType);
            if (quality) qualities.add(quality);
          });
          const uniqueQualities = Array.from(qualities).sort((a, b) => {
            const order = { "4K": 0, "HD": 1, "SD": 2 };
            return (order[a as keyof typeof order] ?? 99) - (order[b as keyof typeof order] ?? 99);
          });

          return (
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQualityClick("all")}
                  className={cn(
                    "h-9 rounded-[25px] cursor-pointer flex-shrink-0 px-4 transition-colors",
                    selectedQuality === "all"
                      ? "bg-blue-50 dark:bg-muted border-blue-200 dark:border-border text-foreground"
                      : "bg-muted border-none text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  All
                </Button>
                {uniqueQualities.map((quality) => {
                  const isSelected = selectedQuality === quality;
                  return (
                    <Button
                      key={quality}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQualityClick(quality)}
                      className={cn(
                        "h-9 rounded-[25px] cursor-pointer flex-shrink-0 px-4 transition-colors",
                        isSelected
                          ? "bg-blue-50 dark:bg-muted border-blue-200 dark:border-border text-foreground"
                          : "bg-muted border-none text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {quality}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })()
      ) : (
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 pb-2">
            {/* All button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterClick("all")}
              className={cn(
                "h-9 rounded-[25px] cursor-pointer flex-shrink-0 px-4 transition-colors",
                selectedFilter === "all"
                  ? "bg-blue-50 dark:bg-muted border-blue-200 dark:border-border text-foreground"
                  : "bg-muted border-none text-muted-foreground hover:bg-muted/80"
              )}
            >
              All
            </Button>
            {/* Individual filter buttons - only show sections with offers */}
            {sectionsWithOffers.map((section) => {
              const isSelected = selectedFilter === section.key;
              return (
                <Button
                  key={section.key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterClick(section.key)}
                  className={cn(
                    "h-9 rounded-[25px] cursor-pointer flex-shrink-0 px-4 transition-colors",
                    isSelected
                      ? "bg-blue-50 dark:bg-muted border-blue-200 dark:border-border text-foreground"
                      : "bg-muted border-none text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {section.title}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Render based on view mode */}
      {viewMode === "list" ? (
        <WatchListView watchAvailability={data} selectedFilter={selectedFilter} selectedQuality={selectedQuality} />
      ) : (
        <>
          {filteredSections.map((section) => {
        const offers = data.offersByType[section.key] || [];
        if (!offers.length) return null;
        return (
          <div key={section.key} className="space-y-2">
            <h5 className="text-xl font-semibold">{section.title}</h5>
            <p className="text-sm text-muted-foreground">{section.description}</p>
            <div className="divide-y divide-border rounded-2xl border border-border bg-card/30">
              {offers.map((offer, index) => {
                const isLast = index === offers.length - 1;
                return (
                  <ModalOfferRow 
                    key={`${offer.providerId}-${offer.monetizationType}`} 
                    offer={offer} 
                    ctaLabel={section.ctaLabel} 
                    index={index}
                    isLast={isLast}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
        </>
      )}
    </div>
  );
}

function ModalOfferRow({ offer, ctaLabel, index, isLast }: { offer: JustWatchOffer; ctaLabel: string; index: number; isLast: boolean }) {
  const displayPrice =
    offer.retailPrice && offer.currency
      ? new Intl.NumberFormat(undefined, { style: "currency", currency: offer.currency, maximumFractionDigits: 2 }).format(offer.retailPrice)
      : null;
  const href = offer.standardWebUrl ?? offer.deepLinkUrl ?? "#";
  const isEven = index % 2 === 0;
  return (
    <div className={cn(
      "flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
      isEven ? "" : "bg-[#f5f5f5] dark:bg-muted/50",
      isLast && "rounded-b-2xl"
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {offer.iconUrl ? (
          <Image src={offer.iconUrl} alt={offer.providerName} title={offer.providerName} width={24} height={24} className="rounded flex-shrink-0" unoptimized />
        ) : (
          <span className="text-xs font-medium text-muted-foreground w-6 h-6 flex items-center justify-center rounded bg-muted flex-shrink-0">
            {offer.providerName[0]}
          </span>
        )}
        <span className="font-medium truncate text-sm">{offer.providerName}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {displayPrice ? <span className="text-sm text-muted-foreground">{displayPrice}</span> : <span className="text-sm text-muted-foreground">Included</span>}
        <Button size="sm" variant="outline" asChild disabled={!href || href === "#"}>
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm">
            {ctaLabel === "Watch Now" && <FaPlay className="h-4 w-4 fill-current" />}
            {ctaLabel}
          </a>
        </Button>
      </div>
    </div>
  );
}

interface EpisodeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  episode: Episode | null;
  tvShow: TMDBSeries;
  tvShowDetails: TVShowDetails | null;
  trailer: TMDBVideo | null;
  /** Show-level availability; used when season API returns no data so modal still shows something. */
  fallbackAvailability?: JustWatchAvailabilityResponse | null;
}

export default function EpisodeDetailModal({
  isOpen,
  onClose,
  episode,
  tvShow,
  tvShowDetails,
  trailer,
  fallbackAvailability,
}: EpisodeDetailModalProps) {
  const router = useRouter();
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const { isInWatchlist, toggle, isLoading: isWatchlistLoading } = useToggleWatchlist();
  const { data: seasonAvailability, isLoading: isLoadingSeasonAvailability } = useSeasonWatchProviders(
    tvShow?.id ?? null,
    episode?.season_number ?? null,
    "US"
  );

  if (!episode) return null;

  const tvShowTitle = tvShow.name;
  const posterPath = tvShow.poster_path || tvShow.backdrop_path;
  const backdropPath = tvShow.backdrop_path || tvShow.poster_path;
  
  // Get creators
  const creators = tvShowDetails?.created_by || [];
  const isInWatchlistValue = isInWatchlist(tvShow.id, "tv");

  // Get top cast (first 4)
  const topCast = tvShowDetails?.credits?.cast?.slice(0, 4) || [];

  const handleAddToWatchlist = async () => {
    try {
      await toggle(tvShow, "tv");
      if (!isInWatchlistValue) {
        toast.success(`Added ${tvShowTitle} to watchlist`);
      } else {
        toast.success(`Removed ${tvShowTitle} from watchlist`);
      }
    } catch (error) {
      toast.error("Failed to update watchlist");
      console.error(error);
    }
  };

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
        <DialogContent className="w-full max-w-[calc(100vw-1rem)] sm:max-w-3xl lg:max-w-[50rem] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="sr-only">Episode Details</DialogTitle>
          </DialogHeader>

          {/* First section: poster + film metadata */}
          <div className="px-6 pt-4 pb-4 border-b border-border">
            <div className="flex flex-row gap-4">
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
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="text-lg font-semibold truncate sm:truncate-none">
                    {tvShowTitle}
                  </h3>
                </div>
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                  {rating > 0 && (
                    <div className="flex items-center gap-1.5">
                      {imdbId ? (
                        <IMDBBadge size={16} />
                      ) : (
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      )}
                      <span className="font-semibold">{rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-3">
              <TabsList className="w-fit">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="watch">Where to Watch</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="details" className="flex-1 overflow-y-auto scrollbar-thin mt-0 px-6">
              <div className="space-y-6 pb-6">
              {/* Episode Synopsis, Creator, Stars */}
              <div className="space-y-4 pt-4">
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
                  {creators.length > 0 ? (
                    <div className="text-sm flex flex-wrap gap-1">
                      {creators.map((creator, index) => (
                        <span key={creator.id}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/person/${createPersonSlug(creator.id, creator.name)}`);
                            }}
                            className="text-primary hover:text-primary/80 underline transition-colors cursor-pointer"
                          >
                            {creator.name}
                          </button>
                          {index < creators.length - 1 && <span>,</span>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm">N/A</p>
                  )}
                </div>

                {/* Stars */}
                <div>
                  <h5 className="text-sm font-semibold mb-2 text-muted-foreground">Stars</h5>
                  {topCast.length > 0 ? (
                    <div className="text-sm flex flex-wrap gap-1">
                      {topCast.map((star, index) => (
                        <span key={star.id}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/person/${createPersonSlug(star.id, star.name)}`);
                            }}
                            className="text-primary hover:text-primary/80 underline transition-colors cursor-pointer"
                          >
                            {star.name}
                          </button>
                          {index < topCast.length - 1 && <span>,</span>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm">N/A</p>
                  )}
                </div>
              </div>
            </div>
            </TabsContent>

            <TabsContent value="watch" className="flex-1 overflow-y-auto scrollbar-thin mt-0 px-6">
              <EpisodeModalWhereToWatch
                seasonNumber={episode.season_number}
                availability={seasonAvailability}
                fallbackAvailability={fallbackAvailability}
                isLoading={isLoadingSeasonAvailability}
              />
            </TabsContent>
          </Tabs>

          {/* Footer: Watch Trailer and Add to Watchlist */}
          <div className="border-t px-6 py-4 flex items-center justify-center gap-3 overflow-x-auto">
            {trailer && (
              <Button
                variant="default"
                onClick={handleOpenTrailer}
                className="cursor-pointer rounded-[25px]"
              >
                <FaPlay className="h-4 w-4" />
                <span>Watch Trailer</span>
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleAddToWatchlist}
              disabled={isWatchlistLoading}
              className="cursor-pointer rounded-[25px]"
            >
              <FaBookmark 
                className="h-4 w-4" 
                style={isInWatchlistValue ? { fill: "#e0b416" } : {}}
              />
              <span className="hidden sm:inline">
                {isInWatchlistValue ? "In watchlist" : "Add to watchlist"}
              </span>
              <span className="sm:hidden">
                {isInWatchlistValue ? "In watchlist" : "Add to watchlist"}
              </span>
            </Button>
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

