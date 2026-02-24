"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
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

  // Get provider counts by type based on filtered results
  const providerCounts = useMemo(() => {
    const allCount = providers.length;
    const myServicesCount = selectedProviders.length;
    // For other filters, show count of filtered providers (which will be all for now)
    const filteredCount = filteredProviders.length;

    return {
      all: allCount,
      "my-services": myServicesCount,
      subscriptions: filteredCount,
      "buy-rent": filteredCount,
      free: filteredCount,
    };
  }, [providers, selectedProviders, filteredProviders]);

  return (
    <div className="w-full bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-shrink-0 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSelectedFilter("all")}
              className={cn(
                "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors",
                selectedFilter === "all"
                  ? "bg-blue-50 text-foreground dark:bg-accent"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              All ({providerCounts.all})
            </button>
            <button
              onClick={() => setSelectedFilter("my-services")}
              className={cn(
                "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors",
                selectedFilter === "my-services"
                  ? "bg-blue-50 text-foreground dark:bg-accent"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              My Services ({providerCounts["my-services"]})
            </button>
            <button
              onClick={() => setSelectedFilter("subscriptions")}
              className={cn(
                "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors",
                selectedFilter === "subscriptions"
                  ? "bg-blue-50 text-foreground dark:bg-accent"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Subscriptions ({providerCounts.subscriptions})
            </button>
            <button
              onClick={() => setSelectedFilter("buy-rent")}
              className={cn(
                "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors",
                selectedFilter === "buy-rent"
                  ? "bg-blue-50 text-foreground dark:bg-accent"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Buy/Rent ({providerCounts["buy-rent"]})
            </button>
            <button
              onClick={() => setSelectedFilter("free")}
              className={cn(
                "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors",
                selectedFilter === "free"
                  ? "bg-blue-50 text-foreground dark:bg-accent"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Free ({providerCounts.free})
            </button>
          </div>

          {/* Plus Button and Provider Carousel */}
          <div className="relative group/carousel flex-1 min-w-0 px-4 sm:px-6 lg:px-8">
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
                  {filteredProviders.map((provider) => {
                    const isSelected = activeProvider === provider.provider_id;
                    return (
                      <CarouselItem
                        key={provider.provider_id}
                        className="pl-2 sm:pl-3 md:pl-4 basis-auto"
                      >
                        <button
                          onClick={() => onProviderClick(provider.provider_id)}
                          className={cn(
                            "cursor-pointer rounded-lg border-0 p-0 h-10 w-10 transition-colors flex items-center justify-center overflow-hidden relative",
                            isSelected
                              ? "bg-primary"
                              : "bg-background hover:bg-accent"
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
