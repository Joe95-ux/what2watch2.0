"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { data: providerTypes } = useProviderTypes(watchRegion);

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
          {/* Filter Dropdown */}
          <div className="flex-shrink-0">
            <Select value={selectedFilter} onValueChange={(value) => setSelectedFilter(value as FilterType)}>
              <SelectTrigger className="w-[180px] h-9 text-[0.95rem] cursor-pointer">
                <SelectValue>
                  {selectedFilter === "all" && `All (${providerCounts.all})`}
                  {selectedFilter === "my-services" && `My Services (${providerCounts["my-services"]})`}
                  {selectedFilter === "subscriptions" && `Subscriptions (${providerCounts.subscriptions})`}
                  {selectedFilter === "buy-rent" && `Buy/Rent (${providerCounts["buy-rent"]})`}
                  {selectedFilter === "free" && `Free (${providerCounts.free})`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">
                  All ({providerCounts.all})
                </SelectItem>
                <SelectItem value="my-services" className="cursor-pointer">
                  My Services ({providerCounts["my-services"]})
                </SelectItem>
                <SelectItem value="subscriptions" className="cursor-pointer">
                  Subscriptions ({providerCounts.subscriptions})
                </SelectItem>
                <SelectItem value="buy-rent" className="cursor-pointer">
                  Buy/Rent ({providerCounts["buy-rent"]})
                </SelectItem>
                <SelectItem value="free" className="cursor-pointer">
                  Free ({providerCounts.free})
                </SelectItem>
              </SelectContent>
            </Select>
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
