"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import Image from "next/image";
import type { WatchProvider } from "@/hooks/use-watch-providers";

interface ProviderBarProps {
  providers: WatchProvider[];
  selectedProviders: number[];
  activeProvider?: number;
  onProviderClick: (providerId: number) => void;
  onAddServices: () => void;
  watchRegion: string;
}

type FilterType = "all" | "my-services" | "subscriptions" | "buy-rent" | "free";

export function ProviderBar({
  providers,
  selectedProviders,
  activeProvider,
  onProviderClick,
  onAddServices,
  watchRegion,
}: ProviderBarProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");

  // Get provider counts by type
  const providerCounts = useMemo(() => {
    // This would need to be calculated based on actual provider data
    // For now, using placeholder logic
    const allCount = providers.length;
    const myServicesCount = selectedProviders.length;
    // These would need actual data from JustWatch or TMDB to determine provider types
    const subscriptionsCount = providers.length; // Placeholder
    const buyRentCount = providers.length; // Placeholder
    const freeCount = providers.length; // Placeholder

    return {
      all: allCount,
      "my-services": myServicesCount,
      subscriptions: subscriptionsCount,
      "buy-rent": buyRentCount,
      free: freeCount,
    };
  }, [providers, selectedProviders]);

  // Filter providers based on selected filter
  const filteredProviders = useMemo(() => {
    if (selectedFilter === "all") {
      return providers;
    } else if (selectedFilter === "my-services") {
      return providers.filter((p) => selectedProviders.includes(p.provider_id));
    }
    // For other filters, we'd need provider type data
    return providers;
  }, [providers, selectedFilter, selectedProviders]);

  return (
    <div className="w-full border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFilter("all")}
              className={cn(
                "h-9 rounded-[25px] border-none flex-shrink-0",
                selectedFilter === "all"
                  ? "bg-blue-50 text-foreground border-blue-200 dark:bg-blue-900 dark:border-blue-700"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              All ({providerCounts.all})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFilter("my-services")}
              className={cn(
                "h-9 rounded-[25px] border-none flex-shrink-0",
                selectedFilter === "my-services"
                  ? "bg-blue-50 text-foreground border-blue-200 dark:bg-blue-900 dark:border-blue-700"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              My Services ({providerCounts["my-services"]})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFilter("subscriptions")}
              className={cn(
                "h-9 rounded-[25px] border-none flex-shrink-0",
                selectedFilter === "subscriptions"
                  ? "bg-blue-50 text-foreground border-blue-200 dark:bg-blue-900 dark:border-blue-700"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Subscriptions ({providerCounts.subscriptions})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFilter("buy-rent")}
              className={cn(
                "h-9 rounded-[25px] border-none flex-shrink-0",
                selectedFilter === "buy-rent"
                  ? "bg-blue-50 text-foreground border-blue-200 dark:bg-blue-900 dark:border-blue-700"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Buy/Rent ({providerCounts["buy-rent"]})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFilter("free")}
              className={cn(
                "h-9 rounded-[25px] border-none flex-shrink-0",
                selectedFilter === "free"
                  ? "bg-blue-50 text-foreground border-blue-200 dark:bg-blue-900 dark:border-blue-700"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Free ({providerCounts.free})
            </Button>
          </div>

          {/* Plus Button and Provider Carousel */}
          <div className="relative group/carousel flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Plus Button (only shown when My Services is selected) */}
              {selectedFilter === "my-services" && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onAddServices}
                  className="h-10 w-10 flex-shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}

              {/* Carousel */}
              <Carousel
                opts={{
                  align: "start",
                  slidesToScroll: 1,
                  dragFree: true,
                  breakpoints: {
                    "(max-width: 640px)": { slidesToScroll: 1, dragFree: true },
                    "(min-width: 641px) and (max-width: 768px)": { slidesToScroll: 2, dragFree: true },
                    "(min-width: 769px) and (max-width: 1024px)": { slidesToScroll: 3, dragFree: true },
                    "(min-width: 1025px)": { slidesToScroll: 4, dragFree: true },
                  },
                }}
                className="flex-1 min-w-0"
              >
                <CarouselContent className="-ml-2 sm:-ml-3 md:-ml-4">
                  {filteredProviders.map((provider) => (
                    <CarouselItem
                      key={provider.provider_id}
                      className="pl-2 sm:pl-3 md:pl-4 basis-auto"
                    >
                      <button
                        onClick={() => onProviderClick(provider.provider_id)}
                        className={cn(
                          "relative h-16 w-16 rounded-lg border overflow-hidden bg-muted hover:border-primary transition-colors cursor-pointer",
                          activeProvider === provider.provider_id
                            ? "border-primary border-2"
                            : selectedProviders.includes(provider.provider_id)
                            ? "border-green-500 border-2"
                            : "border-border"
                        )}
                      >
                        {provider.logo_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w154${provider.logo_path}`}
                            alt={provider.provider_name}
                            fill
                            className="object-contain p-2"
                            unoptimized
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-center p-2">
                            {provider.provider_name}
                          </div>
                        )}
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10" />
                <CarouselNext className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10" />
              </Carousel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
