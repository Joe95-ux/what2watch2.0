"use client";

import Image from "next/image";
import { JustWatchAvailabilityResponse } from "@/lib/justwatch";
import { cn } from "@/lib/utils";

interface WatchListViewProps {
  watchAvailability: JustWatchAvailabilityResponse | null | undefined;
  selectedFilter: string;
  selectedQuality?: string;
}

const sections: Array<{
  key: keyof JustWatchAvailabilityResponse["offersByType"];
  label: string;
}> = [
  { key: "flatrate", label: "STREAM" },
  { key: "buy", label: "Buy/Rent" },
  { key: "rent", label: "Buy/Rent" },
  { key: "free", label: "Free" },
  { key: "ads", label: "With Ads" },
];

export default function WatchListView({ watchAvailability, selectedFilter, selectedQuality }: WatchListViewProps) {
  if (!watchAvailability) return null;

  const formatPrice = (price: number | null | undefined, currency: string | null | undefined): string => {
    if (!price || !currency) return "";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 2,
    });
    return formatter.format(price).replace(/^[A-Z]{2}\$/, "$");
  };

  const getQuality = (presentationType: string | null | undefined): string => {
    if (!presentationType) return "";
    const quality = presentationType.toLowerCase();
    // Check for highest quality first (order matters to avoid false positives)
    if (quality.includes("4k") || quality.includes("uhd")) return "4K";
    if (quality.includes("hd") && !quality.includes("uhd")) return "HD"; // Explicitly exclude "uhd"
    if (quality.includes("sd")) return "SD";
    return "";
  };

  // Filter ALL offers by quality FIRST (at raw data level)
  const allOffers = watchAvailability.allOffers || [];
  const qualityFilteredOffers = selectedQuality && selectedQuality !== "all"
    ? allOffers.filter((offer) => {
        const offerQuality = getQuality(offer.presentationType);
        return offerQuality === selectedQuality;
      })
    : allOffers;

  // Now group filtered offers by type - create new arrays to avoid reference issues
  const flatrateOffers = qualityFilteredOffers.filter((o) => o.monetizationType === "flatrate");
  const buyOffers = qualityFilteredOffers.filter((o) => o.monetizationType === "buy");
  const rentOffers = qualityFilteredOffers.filter((o) => o.monetizationType === "rent");
  const freeOffers = qualityFilteredOffers.filter((o) => o.monetizationType === "free");
  const adsOffers = qualityFilteredOffers.filter((o) => o.monetizationType === "ads");

  // Build rows array from filtered offers - create fresh arrays for each row
  const rows: Array<{ key: string; label: string; offers: JustWatchAvailabilityResponse["allOffers"] }> = [];

  // Add flatrate
  if (flatrateOffers.length > 0) {
    rows.push({ key: "flatrate", label: "STREAM", offers: [...flatrateOffers] });
  }

  // Always show buy and rent as separate rows
  if (buyOffers.length > 0) {
    rows.push({ key: "buy", label: "Buy", offers: [...buyOffers] });
  }
  if (rentOffers.length > 0) {
    rows.push({ key: "rent", label: "Rent", offers: [...rentOffers] });
  }

  // Add free
  if (freeOffers.length > 0) {
    rows.push({ key: "free", label: "Free", offers: [...freeOffers] });
  }

  // Add ads
  if (adsOffers.length > 0) {
    rows.push({ key: "ads", label: "With Ads", offers: [...adsOffers] });
  }

  // Filter rows based on selectedFilter
  const filteredRows = selectedFilter === "all"
    ? rows
    : rows.filter(row => {
        if (selectedFilter === "flatrate") return row.key === "flatrate";
        if (selectedFilter === "buy") return row.key === "buy";
        if (selectedFilter === "rent") return row.key === "rent";
        return row.key === selectedFilter;
      });

  if (filteredRows.length === 0) return null;

  return (
    <div className="space-y-0">
      {filteredRows.map((row, index) => {
        const isEven = index % 2 === 0;
        const labelBgColor = isEven ? "bg-muted" : "bg-muted/50";

        return (
          <div key={row.key} className={cn(index < filteredRows.length - 1 && "border-b border-border")}>
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
                  {row.offers.map((offer, offerIndex) => {
                    const quality = getQuality(offer.presentationType);
                    const price = offer.monetizationType === "rent" || offer.monetizationType === "buy"
                      ? formatPrice(offer.retailPrice, offer.currency)
                      : "";

                    return (
                      <a
                        key={`${row.key}-${offer.providerId}-${offer.presentationType || offerIndex}`}
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
  );
}
