"use client";

import { useMemo } from "react";
import Image from "next/image";
import { JustWatchAvailabilityResponse, JustWatchCountry } from "@/lib/justwatch";
import { cn } from "@/lib/utils";
import { RegionDropdown, type RegionOption } from "@/components/ui/region-dropdown";

interface ContentDetailWhereToWatchProps {
  watchAvailability: JustWatchAvailabilityResponse | null | undefined;
  watchCountry?: string;
  onWatchCountryChange?: (code: string) => void;
  justwatchCountries?: JustWatchCountry[];
  isLoading?: boolean;
}

export default function ContentDetailWhereToWatch({
  watchAvailability,
  watchCountry = "US",
  onWatchCountryChange,
  justwatchCountries = [],
  isLoading = false,
}: ContentDetailWhereToWatchProps) {
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

  if (!watchAvailability && !isLoading) return null;

  // Build rows array with alternating backgrounds
  const rows: Array<{ key: string; label: string; offers: JustWatchAvailabilityResponse["allOffers"] }> = [];

  // Add flatrate
  const flatrateOffers = watchAvailability?.offersByType?.flatrate || [];
  if (flatrateOffers.length > 0) {
    rows.push({ key: "flatrate", label: "STREAM", offers: flatrateOffers });
  }

  // Combine buy and rent
  const buyOffers = watchAvailability?.offersByType?.buy || [];
  const rentOffers = watchAvailability?.offersByType?.rent || [];
  if (buyOffers.length > 0 || rentOffers.length > 0) {
    rows.push({ key: "buy-rent", label: "Buy/Rent", offers: [...buyOffers, ...rentOffers] });
  }

  // Add free
  const freeOffers = watchAvailability?.offersByType?.free || [];
  if (freeOffers.length > 0) {
    rows.push({ key: "free", label: "Free", offers: freeOffers });
  }

  // Add ads
  const adsOffers = watchAvailability?.offersByType?.ads || [];
  if (adsOffers.length > 0) {
    rows.push({ key: "ads", label: "With Ads", offers: adsOffers });
  }

  if (rows.length === 0) return null;

  // Map JustWatchCountry to RegionOption format
  const regionOptions: RegionOption[] = useMemo(() => {
    return justwatchCountries.map((c) => ({
      iso_3166_1: c.code,
      english_name: c.name,
    }));
  }, [justwatchCountries]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Where to Watch</h3>
        {regionOptions.length > 0 && onWatchCountryChange && (
          <RegionDropdown
            regions={regionOptions}
            value={watchCountry}
            onValueChange={onWatchCountryChange}
            className="w-[230px]"
          />
        )}
      </div>
      {isLoading ? (
        <div className="space-y-0">
          {[1, 2].map((i) => (
            <div key={i} className={cn(i === 1 && "border-b border-border")}>
              <div className="flex items-center gap-2 h-[100px]">
                <div className={cn("flex-shrink-0 w-10 h-full flex items-center justify-center", i % 2 === 0 ? "bg-muted" : "bg-muted/50")}>
                  <div className="h-4 w-4 bg-muted-foreground/20 rounded animate-pulse" />
                </div>
                <div className="flex-1 min-w-0 h-full overflow-x-auto scrollbar-thin">
                  <div className="flex items-center gap-2 h-full py-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="flex-shrink-0">
                        <div className="h-[50px] w-[50px] rounded-lg bg-muted animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : watchAvailability ? (
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
      ) : null}
      
      {/* JustWatch Attribution */}
      {watchAvailability && (
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
      )}
    </div>
  );
}
