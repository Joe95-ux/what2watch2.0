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

interface ContentDetailWhereToWatchProps {
  watchAvailability: JustWatchAvailabilityResponse;
}

export default function ContentDetailWhereToWatch({
  watchAvailability,
}: ContentDetailWhereToWatchProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Where to Watch
      </h3>
      <div className="space-y-3">
        {[
          { key: "flatrate" as const, label: "Subscriptions" },
          { key: "buy" as const, label: "Buy/Rent" },
          { key: "rent" as const, label: "Buy/Rent" },
          { key: "free" as const, label: "Free" },
          { key: "ads" as const, label: "With Ads" },
        ].map(({ key, label }) => {
          const offers = watchAvailability.offersByType?.[key] || [];
          if (offers.length === 0) return null;

          // Combine buy and rent into one row
          if (key === "rent") {
            const buyOffers = watchAvailability.offersByType?.buy || [];
            if (buyOffers.length === 0) return null;
            const combinedOffers = [...buyOffers, ...offers];

            return (
              <div key="buy-rent" className="flex gap-3">
                <div className="bg-[#E0B416] px-3 py-2 rounded flex items-center min-w-[100px] flex-shrink-0">
                  <span className="text-sm font-semibold text-foreground">Buy/Rent</span>
                </div>
                <div className="flex-1 min-w-0">
                  <Carousel
                    opts={{
                      align: "start",
                      slidesToScroll: 2,
                    }}
                    className="w-full"
                  >
                    <CarouselContent className="-ml-2">
                      {combinedOffers.map((offer) => (
                        <CarouselItem key={offer.providerId} className="pl-2 basis-auto">
                          <a
                            href={offer.standardWebUrl ?? offer.deepLinkUrl ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {offer.iconUrl ? (
                              <Image
                                src={offer.iconUrl}
                                alt={offer.providerName}
                                width={40}
                                height={40}
                                className="rounded"
                                unoptimized
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <span className="text-xs">{offer.providerName[0]}</span>
                              </div>
                            )}
                          </a>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {combinedOffers.length > 2 && (
                      <>
                        <CarouselPrevious className="left-0 h-10 w-8" />
                        <CarouselNext className="right-0 h-10 w-8" />
                      </>
                    )}
                  </Carousel>
                </div>
              </div>
            );
          }

          if (key === "buy") return null; // Already handled with rent

          return (
            <div key={key} className="flex gap-3">
              <div className="bg-[#E0B416] px-3 py-2 rounded flex items-center min-w-[100px] flex-shrink-0">
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </div>
              <div className="flex-1 min-w-0">
                <Carousel
                  opts={{
                    align: "start",
                    slidesToScroll: 2,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {offers.map((offer) => (
                      <CarouselItem key={offer.providerId} className="pl-2 basis-auto">
                        <a
                          href={offer.standardWebUrl ?? offer.deepLinkUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {offer.iconUrl ? (
                            <Image
                              src={offer.iconUrl}
                              alt={offer.providerName}
                              width={40}
                              height={40}
                              className="rounded"
                              unoptimized
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <span className="text-xs">{offer.providerName[0]}</span>
                            </div>
                          )}
                        </a>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {offers.length > 2 && (
                    <>
                      <CarouselPrevious className="left-0 h-10 w-8" />
                      <CarouselNext className="right-0 h-10 w-8" />
                    </>
                  )}
                </Carousel>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
