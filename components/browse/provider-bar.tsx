"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import Image from "next/image";
import type { WatchProvider } from "@/hooks/use-watch-providers";
import { useProviderTypes } from "@/hooks/use-provider-types";

interface ProviderBarProps {
  providers: WatchProvider[];
  selectedProviders: number[];
  activeProvider?: number;
  onProviderClick: (providerId: number) => void;
  onAddServices: () => void;
  watchRegion: string;
  onFilterChange?: (filter: FilterType) => void;
  selectedFilter?: FilterType;
}

type FilterType = "all" | "my-services" | "subscriptions" | "buy-rent" | "free";

export function ProviderBar({
  providers,
  selectedProviders,
  activeProvider,
  onProviderClick,
  onAddServices,
  watchRegion,
  onFilterChange,
  selectedFilter: externalSelectedFilter,
}: ProviderBarProps) {
  const [internalSelectedFilter, setInternalSelectedFilter] = useState<FilterType>("all");
  const selectedFilter = externalSelectedFilter ?? internalSelectedFilter;
  const { data: providerTypes } = useProviderTypes(watchRegion);

  const handleFilterChange = (filter: FilterType) => {
    if (externalSelectedFilter === undefined) {
      setInternalSelectedFilter(filter);
    }
    onFilterChange?.(filter);
  };

  // Filter providers based on selected filter
  const filteredProviders = useMemo(() => {
    if (selectedFilter === "all") {
      return providers;
    } else if (selectedFilter === "my-services") {
      return providers.filter((p) => selectedProviders.includes(p.provider_id));
    } else if (selectedFilter === "subscriptions" && providerTypes) {
      return providers.filter((p) => providerTypes.flatrate.has(p.provider_id));
    } else if (selectedFilter === "buy-rent" && providerTypes) {
      return providers.filter((p) => 
        providerTypes.buy.has(p.provider_id) || providerTypes.rent.has(p.provider_id)
      );
    } else if (selectedFilter === "free" && providerTypes) {
      // Free includes both free and ads providers
      return providers.filter((p) => 
        providerTypes.free.has(p.provider_id) || providerTypes.ads.has(p.provider_id)
      );
    }
    return providers;
  }, [providers, selectedFilter, selectedProviders, providerTypes]);

  // Get provider counts by type - each count is independent and not affected by selected filter
  const providerCounts = useMemo(() => {
    const allCount = providers.length;
    const myServicesCount = selectedProviders.length;
    
    // Calculate counts based on provider types
    let subscriptionsCount = 0;
    let buyRentCount = 0;
    let freeCount = 0;

    if (providerTypes) {
      // Count unique providers in each category
      subscriptionsCount = Array.from(providerTypes.flatrate).filter((id) =>
        providers.some((p) => p.provider_id === id)
      ).length;
      
      const buyRentIds = new Set([...providerTypes.buy, ...providerTypes.rent]);
      buyRentCount = Array.from(buyRentIds).filter((id) =>
        providers.some((p) => p.provider_id === id)
      ).length;
      
      // Free includes both free and ads providers
      const freeIds = new Set([...providerTypes.free, ...providerTypes.ads]);
      freeCount = Array.from(freeIds).filter((id) =>
        providers.some((p) => p.provider_id === id)
      ).length;
    } else {
      // Fallback to showing all providers if types aren't loaded yet
      subscriptionsCount = providers.length;
      buyRentCount = providers.length;
      freeCount = providers.length;
    }

    return {
      all: allCount,
      "my-services": myServicesCount,
      subscriptions: subscriptionsCount,
      "buy-rent": buyRentCount,
      free: freeCount,
    };
  }, [providers, selectedProviders, providerTypes]);

  return (
    <div className="w-full bg-background/95 backdrop-blur-sm rounded-lg">
      <div className="container mx-auto px-2 py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-shrink-0">
            <button
              onClick={() => handleFilterChange("all")}
              className={cn(
                "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors text-[0.95rem]",
                selectedFilter === "all"
                  ? "bg-blue-50 text-foreground dark:bg-accent"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              All ({providerCounts.all})
            </button>
            <button
              onClick={() => handleFilterChange("my-services")}
              className={cn(
                "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors text-[0.95rem]",
                selectedFilter === "my-services"
                  ? "bg-blue-50 text-foreground dark:bg-accent"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              My Services ({providerCounts["my-services"]})
            </button>
            <button
              onClick={() => handleFilterChange("subscriptions")}
              className={cn(
                "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors text-[0.95rem]",
                selectedFilter === "subscriptions"
                  ? "bg-blue-50 text-foreground dark:bg-accent"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Subscriptions ({providerCounts.subscriptions})
            </button>
            <button
              onClick={() => handleFilterChange("buy-rent")}
              className={cn(
                "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors text-[0.95rem]",
                selectedFilter === "buy-rent"
                  ? "bg-blue-50 text-foreground dark:bg-accent"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Buy/Rent ({providerCounts["buy-rent"]})
            </button>
            <button
              onClick={() => handleFilterChange("free")}
              className={cn(
                "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors text-[0.95rem]",
                selectedFilter === "free"
                  ? "bg-blue-50 text-foreground dark:bg-accent"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Free ({providerCounts.free})
            </button>
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
                <CarouselContent className="-ml-1 sm:-ml-1.5 md:-ml-2">
                  {filteredProviders.map((provider) => {
                    const isSelected = activeProvider === provider.provider_id;
                    return (
                      <CarouselItem
                        key={provider.provider_id}
                        className="pl-1 sm:pl-1.5 md:pl-2 basis-auto"
                      >
                        <button
                          onClick={() => onProviderClick(provider.provider_id)}
                          className={cn(
                            "cursor-pointer rounded-lg p-0 h-10 w-10 transition-colors flex items-center justify-center overflow-hidden relative",
                            isSelected
                              ? "bg-primary border-0"
                              : "bg-background hover:bg-accent border border-black/10 dark:border-border"
                          )}
                        >
                          {provider.logo_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                              alt={provider.provider_name}
                              className="h-full w-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-xs font-medium truncate">{provider.provider_name.slice(0, 2)}</span>
                          )}
                          {isSelected && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                              <Check className="h-5 w-5 text-white shrink-0" />
                            </span>
                          )}
                        </button>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="left-0 h-full w-[45px] rounded-l-md rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10" />
                <CarouselNext className="right-0 h-full w-[45px] rounded-r-md rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10" />
              </Carousel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
