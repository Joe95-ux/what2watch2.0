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
import { getCountryFlagEmoji } from "@/hooks/use-watch-regions";
import { ChevronsUpDown, Check } from "lucide-react";

interface WatchBreakdownSectionProps {
  availability: JustWatchAvailabilityResponse | null | undefined;
  isLoading: boolean;
  watchCountry?: string;
  onWatchCountryChange?: (code: string) => void;
  justwatchCountries?: JustWatchCountry[];
}

const sections: Array<{
  key: keyof JustWatchAvailabilityResponse["offersByType"];
  title: string;
  description: string;
  ctaLabel: string;
}> = [
  { key: "flatrate", title: "Streaming", description: "Included with subscription", ctaLabel: "Open App" },
  { key: "ads", title: "With Ads", description: "Free with ads", ctaLabel: "Watch Free" },
  { key: "free", title: "Free to Watch", description: "Completely free sources", ctaLabel: "Start Watching" },
  { key: "rent", title: "Rent", description: "Pay once, limited time access", ctaLabel: "Rent" },
  { key: "buy", title: "Buy", description: "Purchase to own", ctaLabel: "Buy" },
];

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
            className="w-[180px] justify-between cursor-pointer"
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

  const ranks = availability.ranks;
  const fullPath = availability.fullPath;
  const justwatchUrl = fullPath ? `https://www.justwatch.com${fullPath}` : null;
  const weekRank = ranks?.["7d"];
  const monthRank = ranks?.["30d"];
  const primaryRank = weekRank ?? monthRank ?? ranks?.["1d"];
  const rankLabel = weekRank ? "7 days" : monthRank ? "30 days" : "24 hours";

  return (
    <section className="py-12 space-y-8" id="watch">
      {/* Streaming chart rank - shown when available from JustWatch */}
      {primaryRank && justwatchUrl && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Streaming chart</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Real-time rank by streaming popularity on JustWatch
          </p>
          <a
            href={justwatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors w-fit cursor-pointer"
          >
            <span className="text-lg font-semibold text-foreground">#{primaryRank.rank}</span>
            <span className="text-xs text-muted-foreground">({rankLabel})</span>
            {primaryRank.delta !== 0 && (
              <span className={primaryRank.delta > 0 ? "text-green-600 text-xs" : "text-red-600 text-xs"}>
                {primaryRank.delta > 0 ? "↑" : "↓"} {Math.abs(primaryRank.delta)}
              </span>
            )}
          </a>
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
          {justwatchCountries.length > 0 && onWatchCountryChange && (
            <CountryCombobox
              countries={justwatchCountries}
              value={watchCountry}
              onValueChange={onWatchCountryChange}
            />
          )}
        </div>
      </div>

      {sections.map((section) => {
        const offers = availability.offersByType[section.key] || [];
        if (!offers.length) return null;
        return (
          <div key={section.key} className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold">{section.title}</h3>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
            <div className="divide-y divide-border rounded-2xl border border-border bg-card/30">
              {offers.map((offer) => (
                <OfferRow key={`${offer.providerId}-${offer.monetizationType}`} offer={offer} ctaLabel={section.ctaLabel} />
              ))}
            </div>
          </div>
        );
      })}

      <JustWatchCredit />
    </section>
  );
}

function OfferRow({ offer, ctaLabel }: { offer: JustWatchOffer; ctaLabel: string }) {
  const displayPrice =
    offer.retailPrice && offer.currency
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: offer.currency,
          maximumFractionDigits: 2,
        }).format(offer.retailPrice)
      : null;

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
          <a href={offer.deepLinkUrl ?? offer.standardWebUrl ?? "#"} target="_blank" rel="noopener noreferrer">
            {ctaLabel}
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

