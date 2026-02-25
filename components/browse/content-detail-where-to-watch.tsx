"use client";

import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { JustWatchAvailabilityResponse } from "@/lib/justwatch";
import { cn } from "@/lib/utils";

interface ContentDetailWhereToWatchProps {
  watchAvailability: JustWatchAvailabilityResponse;
}

export default function ContentDetailWhereToWatch({
  watchAvailability,
}: ContentDetailWhereToWatchProps) {
  // Build rows array with alternating backgrounds
  const rows: Array<{ key: string; label: string; offers: JustWatchAvailabilityResponse["allOffers"] }> = [];

  // Add flatrate
  const flatrateOffers = watchAvailability.offersByType?.flatrate || [];
  if (flatrateOffers.length > 0) {
    rows.push({ key: "flatrate", label: "Subscriptions", offers: flatrateOffers });
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
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 2,
    }).format(price);
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
      <h3 className="text-lg font-semibold">Where to Watch</h3>
      <div className="space-y-0">
        {rows.map((row, index) => {
          const isEven = index % 2 === 0;
          const labelBgColor = isEven ? "bg-muted" : "bg-muted/50";

          return (
            <div key={row.key}>
              <div className="flex items-start border-b border-border last:border-b-0">
                {/* Rotated Label with alternating background */}
                <div className={cn("flex-shrink-0 w-16 flex items-center justify-center py-4", labelBgColor)}>
                  <span
                    className="text-xs font-semibold text-foreground whitespace-nowrap uppercase"
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      transform: "rotate(180deg)",
                    }}
                  >
                    {row.label}
                  </span>
                </div>

                {/* Provider Carousel */}
                <div className="flex-1 min-w-0 relative group/carousel py-4">
                  <Carousel
                    opts={{
                      align: "start",
                      slidesToScroll: 2,
                    }}
                    className="w-full"
                  >
                    <CarouselContent className="-ml-2 md:-ml-4">
                      {row.offers.map((offer) => {
                        const quality = getQuality(offer.presentationType);
                        const price = offer.monetizationType === "rent" || offer.monetizationType === "buy"
                          ? formatPrice(offer.retailPrice, offer.currency)
                          : "";

                        return (
                          <CarouselItem key={offer.providerId} className="pl-2 md:pl-4 basis-auto">
                            <a
                              href={offer.standardWebUrl ?? offer.deepLinkUrl ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-col items-center gap-2">
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
                                  <div className="text-xs text-muted-foreground text-center">
                                    {quality && <span>{quality}</span>}
                                    {quality && price && <span> </span>}
                                    {price && <span>({price})</span>}
                                  </div>
                                )}
                              </div>
                            </a>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                    {row.offers.length > 2 && (
                      <>
                        <CarouselPrevious 
                          className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10"
                        />
                        <CarouselNext 
                          className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10"
                        />
                      </>
                    )}
                  </Carousel>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
