"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { JustWatchAvailabilityResponse, JustWatchOffer } from "@/lib/justwatch";
import type { JustWatchCountry } from "@/lib/justwatch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCountryFlagEmoji } from "@/hooks/use-watch-regions";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, ChevronUp, ChevronsUpDown, Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface WatchBreakdownSectionProps {
  availability: JustWatchAvailabilityResponse | null | undefined;
  isLoading: boolean;
  watchCountry?: string;
  onWatchCountryChange?: (code: string) => void;
  justwatchCountries?: JustWatchCountry[];
  /** When set (TV), show season-specific availability. */
  seasonAvailability?: JustWatchAvailabilityResponse | null;
  /** For TV: whether season availability is currently loading (so dropdown change shows feedback). */
  isLoadingSeason?: boolean;
  seasonNumber?: number;
  /** For TV: list of seasons for the season dropdown (right of region). */
  seasons?: Array<{ season_number: number; name: string }>;
  /** For TV: called when user selects a season in the dropdown. */
  onSeasonChange?: (seasonNumber: number) => void;
}

const sections: Array<{
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

function SeasonSelect({
  seasons,
  value,
  onValueChange,
}: {
  seasons: Array<{ season_number: number; name: string }>;
  value: number;
  onValueChange: (seasonNumber: number) => void;
}) {
  const regularSeasons = seasons.filter((s) => s.season_number >= 0);
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onValueChange(Number(v))}
    >
      <SelectTrigger className="w-[230px] cursor-pointer">
        <SelectValue placeholder="Season" />
      </SelectTrigger>
      <SelectContent>
        {regularSeasons.map((s) => (
          <SelectItem key={s.season_number} value={String(s.season_number)} className="cursor-pointer">
            {s.season_number === 0 ? "Specials" : s.name || `Season ${s.season_number}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CountryCombobox({
  countries,
  value,
  onValueChange,
}: {
  countries: JustWatchCountry[];
  value: string;
  onValueChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase().trim();
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countries, search]);
  const selected = countries.find((c) => c.code === value);

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground whitespace-nowrap">Region</label>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[230px] justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <span className="text-lg shrink-0">{getCountryFlagEmoji(value)}</span>
              <span className="truncate">{selected?.name ?? value}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="end">
          <Command shouldFilter={false} className="rounded-lg border-0 bg-transparent">
            <CommandInput
              placeholder="Search country..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[300px]">
              {filtered.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">No country found.</div>
              )}
              <CommandGroup forceMount className="p-1">
                {filtered.map((c) => {
                  const isSelected = value === c.code;
                  return (
                    <CommandItem
                      key={c.code}
                      value={c.code}
                      forceMount
                      onSelect={() => {
                        onValueChange(c.code);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="cursor-pointer gap-2"
                    >
                      <span className="text-lg shrink-0">{getCountryFlagEmoji(c.code)}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      {isSelected && <Check className="size-4 shrink-0" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function WatchBreakdownSection({
  availability,
  isLoading,
  watchCountry = "US",
  onWatchCountryChange,
  justwatchCountries = [],
  seasonAvailability,
  isLoadingSeason = false,
  seasonNumber,
  seasons = [],
  onSeasonChange,
}: WatchBreakdownSectionProps) {
  if (isLoading) {
    return (
      <section className="py-12 space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </section>
    );
  }

  if (!availability) {
    return (
      <section className="py-12">
        <p className="text-muted-foreground text-center">
          We couldn&apos;t load real-time availability right now. Please try again later.
        </p>
      </section>
    );
  }

  const [rankWindow, setRankWindow] = useState<"1d" | "7d" | "30d">("7d");
  const ranks = availability.ranks;
  const fullPath = availability.fullPath;
  const justwatchUrl = fullPath ? `https://www.justwatch.com${fullPath}` : null;
  const primaryRankRaw = ranks?.[rankWindow] ?? ranks?.["7d"] ?? ranks?.["30d"] ?? ranks?.["1d"];
  const primaryRank =
    primaryRankRaw != null &&
    typeof primaryRankRaw.rank === "number" &&
    Number.isFinite(primaryRankRaw.rank)
      ? {
          rank: primaryRankRaw.rank,
          delta: typeof primaryRankRaw.delta === "number" && Number.isFinite(primaryRankRaw.delta) ? primaryRankRaw.delta : 0,
        }
      : null;
  const rankWindowLabels: Record<"1d" | "7d" | "30d", string> = { "1d": "24h", "7d": "7d", "30d": "30d" };

  const paidOffers = availability.allOffers.filter(
    (o) => (o.monetizationType === "rent" || o.monetizationType === "buy") && o.retailPrice != null && o.retailPrice > 0
  );
  const cheapestRent = paidOffers
    .filter((o) => o.monetizationType === "rent")
    .sort((a, b) => (a.retailPrice ?? Infinity) - (b.retailPrice ?? Infinity))[0];
  const cheapestBuy = paidOffers
    .filter((o) => o.monetizationType === "buy")
    .sort((a, b) => (a.retailPrice ?? Infinity) - (b.retailPrice ?? Infinity))[0];
  const cheapestOffer = cheapestRent ?? cheapestBuy;
  const cheapestPrice =
    cheapestOffer?.retailPrice != null && cheapestOffer?.currency
      ? new Intl.NumberFormat(undefined, { style: "currency", currency: cheapestOffer.currency, maximumFractionDigits: 2 }).format(cheapestOffer.retailPrice)
      : null;

  return (
    <section className="py-12 space-y-8" id="watch">
      {/* Streaming chart rank - hero-style, no descriptions */}
      {primaryRank && justwatchUrl && (
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={justwatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-foreground hover:opacity-90 transition-opacity"
          >
            <Image
              src="/jw-icon.png"
              alt="JustWatch"
              width={24}
              height={24}
              className="object-contain"
              unoptimized
            />
            <span className="font-semibold text-[#F5C518]">#{primaryRank.rank}</span>
            {primaryRank.delta !== 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium",
                  primaryRank.delta > 0 ? "bg-green-600 text-white" : "bg-red-600 text-white"
                )}
              >
                {primaryRank.delta > 0 ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {Math.abs(primaryRank.delta)}
              </span>
            )}
          </a>
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            {(["1d", "7d", "30d"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setRankWindow(w)}
                className={cn(
                  "px-1.5 py-0.5 rounded cursor-pointer",
                  rankWindow === w ? "bg-muted font-medium text-foreground" : "hover:text-foreground"
                )}
              >
                {rankWindowLabels[w]}
              </button>
            ))}
          </span>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Where to Watch</h2>
            <p className="text-sm text-muted-foreground">
              Real-time availability in {justwatchCountries.find((c) => c.code === availability.country)?.name ?? availability.country}
              {availability.lastSyncedAt ? ` • Updated ${new Date(availability.lastSyncedAt).toLocaleDateString()}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {justwatchCountries.length > 0 && onWatchCountryChange && (
              <CountryCombobox
                countries={justwatchCountries}
                value={watchCountry}
                onValueChange={onWatchCountryChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Cheapest to watch callout - border matches rank accent (#F5C518) for visibility */}
      {cheapestOffer && cheapestPrice && (
        <div className="rounded-xl border border-[#F5C518]/50 px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            Cheapest to watch: {cheapestOffer.monetizationType === "rent" ? "Rent" : "Buy"} on {cheapestOffer.providerName} — {cheapestPrice}
          </p>
          <a
            href={cheapestOffer.deepLinkUrl ?? cheapestOffer.standardWebUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline mt-1 inline-block"
          >
            Go to {cheapestOffer.providerName} →
          </a>
        </div>
      )}

      {/* Single availability list: for TV use season data when available, else show-level; season dropdown only when multiple seasons */}
      {(() => {
        const dataSource =
          seasonAvailability != null && seasonNumber != null ? seasonAvailability : availability;
        const showSeasonDropdown =
          seasons.length > 1 && onSeasonChange != null && seasonNumber != null;
        const isUsingSeriesFallback =
          showSeasonDropdown && seasonNumber != null && seasonAvailability == null && !isLoadingSeason;

        return (
          <>
            {isUsingSeriesFallback && (
              <p className="text-sm text-muted-foreground mb-2">
                Season {seasonNumber} availability not available; showing series availability.
              </p>
            )}
            {sections.map((section, idx) => {
              const offers = dataSource.offersByType[section.key] || [];
              if (!offers.length) return null;
              const isFirst = idx === 0;
              return (
                <div key={section.key} className="space-y-3">
                  <div
                    className={
                      isFirst && showSeasonDropdown
                        ? "flex flex-wrap items-start justify-between gap-4"
                        : undefined
                    }
                  >
                    <div>
                      <h3 className="text-xl font-semibold">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                    {isFirst && showSeasonDropdown && (
                      <SeasonSelect
                        seasons={seasons}
                        value={seasonNumber}
                        onValueChange={onSeasonChange}
                      />
                    )}
                  </div>
                  <div className="divide-y divide-border rounded-2xl border border-border bg-card/30">
                    {offers.map((offer) => (
                      <OfferRow
                        key={`${offer.providerId}-${offer.monetizationType}`}
                        offer={offer}
                        ctaLabel={section.ctaLabel}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {showSeasonDropdown && isLoadingSeason && (
              <p className="text-sm text-muted-foreground mt-2">Loading season availability…</p>
            )}
          </>
        );
      })()}

      <JustWatchCredit />
    </section>
  );
}

function OfferRow({ offer, ctaLabel }: { offer: JustWatchOffer; ctaLabel: string }) {
  const isMobile = useIsMobile();
  const displayPrice =
    offer.retailPrice && offer.currency
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: offer.currency,
          maximumFractionDigits: 2,
        }).format(offer.retailPrice)
      : null;
  const useDeepLink = isMobile && offer.deepLinkUrl;
  const href = useDeepLink ? (offer.deepLinkUrl ?? offer.standardWebUrl ?? "#") : (offer.standardWebUrl ?? offer.deepLinkUrl ?? "#");
  const linkLabel = useDeepLink ? "Open in app" : ctaLabel;

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {offer.iconUrl ? (
          <Image src={offer.iconUrl} alt={offer.providerName} width={32} height={32} className="rounded-md" unoptimized />
        ) : (
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {offer.providerName[0]}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium truncate">{offer.providerName}</p>
          <p className="text-sm text-muted-foreground capitalize">
            {offer.monetizationType}
            {offer.presentationType ? ` • ${offer.presentationType.toUpperCase()}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
          {displayPrice ? (
            <span className="text-sm font-medium text-foreground">{displayPrice}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Included</span>
          )}
        <Button
          size="sm"
          variant="outline"
          asChild
          disabled={!offer.standardWebUrl && !offer.deepLinkUrl}
        >
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
            {linkLabel === "Watch Now" && <Play className="h-4 w-4" />}
            {linkLabel}
          </a>
        </Button>
      </div>
    </div>
  );
}

function JustWatchCredit() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

