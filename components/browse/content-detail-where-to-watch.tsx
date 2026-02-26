"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
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
import { Button } from "@/components/ui/button";
import { JustWatchAvailabilityResponse, JustWatchCountry } from "@/lib/justwatch";
import { getCountryFlagEmoji } from "@/hooks/use-watch-regions";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentDetailWhereToWatchProps {
  watchAvailability: JustWatchAvailabilityResponse;
  watchCountry?: string;
  onWatchCountryChange?: (code: string) => void;
  justwatchCountries?: JustWatchCountry[];
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
  );
}

export default function ContentDetailWhereToWatch({
  watchAvailability,
  watchCountry = "US",
  onWatchCountryChange,
  justwatchCountries = [],
}: ContentDetailWhereToWatchProps) {
  // Build rows array with alternating backgrounds
  const rows: Array<{ key: string; label: string; offers: JustWatchAvailabilityResponse["allOffers"] }> = [];

  // Add flatrate
  const flatrateOffers = watchAvailability.offersByType?.flatrate || [];
  if (flatrateOffers.length > 0) {
    rows.push({ key: "flatrate", label: "STREAM", offers: flatrateOffers });
  }

  // Combine buy and rent
  const buyOffers = watchAvailability.offersByType?.buy || [];
  const rentOffers = watchAvailability.offersByType?.rent || [];
  if (buyOffers.length > 0 || rentOffers.length > 0) {
    rows.push({ key: "buy-rent", label: "Buy/Rent", offers: [...buyOffers, ...rentOffers] });
  }

  // Add free
  const freeOffers = watchAvailability.offersByType?.free || [];
  if (freeOffers.length > 0) {
    rows.push({ key: "free", label: "Free", offers: freeOffers });
  }

  // Add ads
  const adsOffers = watchAvailability.offersByType?.ads || [];
  if (adsOffers.length > 0) {
    rows.push({ key: "ads", label: "With Ads", offers: adsOffers });
  }

  if (rows.length === 0) return null;

  const formatPrice = (price: number | null | undefined, currency: string | null | undefined): string => {
    if (!price || !currency) return "";
    // Format as currency without locale-specific prefix (e.g., "US$" -> "$")
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 2,
    });
    return formatter.format(price).replace(/^[A-Z]{2}\$/, "$"); // Remove country prefix if present
  };

  const getQuality = (presentationType: string | null | undefined): string => {
    if (!presentationType) return "";
    // Common quality formats: "4k", "uhd", "hd", "sd", etc.
    const quality = presentationType.toLowerCase();
    if (quality.includes("4k") || quality.includes("uhd")) return "4K";
    if (quality.includes("hd")) return "HD";
    if (quality.includes("sd")) return "SD";
    return presentationType.toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Where to Watch</h3>
        {justwatchCountries.length > 0 && onWatchCountryChange && (
          <CountryCombobox
            countries={justwatchCountries}
            value={watchCountry}
            onValueChange={onWatchCountryChange}
          />
        )}
      </div>
      <div className="space-y-0">
        {rows.map((row, index) => {
          const isEven = index % 2 === 0;
          const labelBgColor = isEven ? "bg-muted" : "bg-muted/50";

          return (
            <div key={row.key} className={cn(index < rows.length - 1 && "border-b border-border")}>
              <div className="flex items-center gap-2 h-[100px]">
                {/* Rotated Label with alternating background */}
                <div className={cn("flex-shrink-0 w-10 h-full flex items-center justify-center", labelBgColor)}>
                  <span
                    className="text-sm font-semibold text-foreground whitespace-nowrap uppercase"
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      transform: "rotate(180deg)",
                    }}
                  >
                    {row.label}
                  </span>
                </div>

                {/* Provider List with Scroll */}
                <div className="flex-1 min-w-0 h-full overflow-x-auto scrollbar-thin">
                  <div className="flex items-center gap-2 h-full py-4">
                    {row.offers.map((offer) => {
                      const quality = getQuality(offer.presentationType);
                      const price = offer.monetizationType === "rent" || offer.monetizationType === "buy"
                        ? formatPrice(offer.retailPrice, offer.currency)
                        : "";

                      return (
                        <a
                          key={offer.providerId}
                          href={offer.standardWebUrl ?? offer.deepLinkUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {offer.iconUrl ? (
                              <div className="relative h-[50px] w-[50px] rounded-lg border border-border overflow-hidden bg-muted hover:border-primary transition-colors cursor-pointer">
                                <Image
                                  src={offer.iconUrl}
                                  alt={offer.providerName}
                                  fill
                                  className="object-contain rounded-lg"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="h-[50px] w-[50px] rounded-lg border border-border bg-muted flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
                                <span className="text-xs text-muted-foreground">{offer.providerName[0]}</span>
                              </div>
                            )}
                            {(quality || price) && (
                              <div className="text-center">
                                {price ? (
                                  <>
                                    <span className="text-muted-foreground" style={{ fontSize: "13px" }}>{price}</span>
                                    {quality && (
                                      <>
                                        <span className="text-muted-foreground" style={{ fontSize: "13px" }}> </span>
                                        <span className="text-[#F5C518]" style={{ fontSize: "11px" }}>{quality}</span>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  quality && (
                                    <span className="text-muted-foreground" style={{ fontSize: "13px" }}>{quality}</span>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
