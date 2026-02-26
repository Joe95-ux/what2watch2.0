"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import Image from "next/image";
import type { WatchProvider } from "@/hooks/use-watch-providers";
import { useProviderTypes } from "@/hooks/use-provider-types";
import { useWatchProviders } from "@/hooks/use-watch-providers";
import { useWatchRegions } from "@/hooks/use-watch-regions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { getCountryFlagEmoji } from "@/hooks/use-watch-regions";

interface SelectServicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: WatchProvider[];
  selectedProviders: number[];
  onSave: (providerIds: number[]) => Promise<void>;
  watchRegion?: string;
  onRegionChange?: (region: string) => void;
}

type ProviderTypeFilter = "all" | "flatrate" | "buy" | "rent" | "free" | "ads";

export function SelectServicesModal({
  open,
  onOpenChange,
  providers,
  selectedProviders: initialSelected,
  onSave,
  watchRegion: initialWatchRegion = "US",
  onRegionChange,
}: SelectServicesModalProps) {
  const [selectedProviders, setSelectedProviders] = useState<number[]>(initialSelected);
  const [providerTypeFilter, setProviderTypeFilter] = useState<ProviderTypeFilter>("all");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [watchRegion, setWatchRegion] = useState(initialWatchRegion);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const { data: watchRegions = [] } = useWatchRegions();
  const { data: regionProviders = [] } = useWatchProviders(watchRegion, { all: true });
  const { data: providerTypes } = useProviderTypes(watchRegion);
  
  const filteredWatchRegions = useMemo(() => {
    if (!countrySearch.trim()) return watchRegions;
    const q = countrySearch.toLowerCase().trim();
    return watchRegions.filter(
      (r) =>
        r.english_name.toLowerCase().includes(q) ||
        r.iso_3166_1.toLowerCase().includes(q)
    );
  }, [watchRegions, countrySearch]);

  // Update region when prop changes
  useEffect(() => {
    setWatchRegion(initialWatchRegion);
  }, [initialWatchRegion]);

  // Use region-specific providers if available, otherwise fall back to passed providers
  const activeProviders = regionProviders.length > 0 ? regionProviders : providers;

  // Determine which type filters are available based on region-specific providers
  const availableTypes = useMemo(() => {
    if (!providerTypes || activeProviders.length === 0) {
      return {
        flatrate: false,
        buy: false,
        rent: false,
        free: false,
        ads: false,
      };
    }

    const hasFlatrate = activeProviders.some((p) => providerTypes.flatrate.has(p.provider_id));
    const hasBuy = activeProviders.some((p) => providerTypes.buy.has(p.provider_id));
    const hasRent = activeProviders.some((p) => providerTypes.rent.has(p.provider_id));
    const hasFree = activeProviders.some((p) => providerTypes.free.has(p.provider_id) || providerTypes.ads.has(p.provider_id));
    const hasAds = activeProviders.some((p) => providerTypes.ads.has(p.provider_id));

    return {
      flatrate: hasFlatrate,
      buy: hasBuy,
      rent: hasRent,
      free: hasFree,
      ads: hasAds,
    };
  }, [providerTypes, activeProviders]);

  const handleRegionChange = (region: string) => {
    setWatchRegion(region);
    if (onRegionChange) {
      onRegionChange(region);
    }
  };

  // Sync selectedProviders when initialSelected changes (e.g., when modal opens with updated user preferences)
  useEffect(() => {
    if (open) {
      setSelectedProviders(initialSelected);
    }
  }, [initialSelected, open]);

  // Filter providers based on type and search
  const filteredProviders = useMemo(() => {
    let filtered = activeProviders;

    // Filter by provider type
    if (providerTypeFilter !== "all" && providerTypes) {
      if (providerTypeFilter === "flatrate") {
        filtered = filtered.filter((p) => providerTypes.flatrate.has(p.provider_id));
      } else if (providerTypeFilter === "buy") {
        filtered = filtered.filter((p) => providerTypes.buy.has(p.provider_id));
      } else if (providerTypeFilter === "rent") {
        filtered = filtered.filter((p) => providerTypes.rent.has(p.provider_id));
      } else if (providerTypeFilter === "free") {
        filtered = filtered.filter((p) => 
          providerTypes.free.has(p.provider_id) || providerTypes.ads.has(p.provider_id)
        );
      } else if (providerTypeFilter === "ads") {
        filtered = filtered.filter((p) => providerTypes.ads.has(p.provider_id));
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter((p) =>
        p.provider_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [activeProviders, searchQuery, providerTypeFilter, providerTypes]);

  // Get selected provider objects for preview
  const selectedProviderObjects = useMemo(() => {
    return activeProviders.filter((p) => selectedProviders.includes(p.provider_id));
  }, [activeProviders, selectedProviders]);

  const handleToggleProvider = (providerId: number) => {
    setSelectedProviders((prev) =>
      prev.includes(providerId)
        ? prev.filter((id) => id !== providerId)
        : [...prev, providerId]
    );
  };

  const handleRemoveFromPreview = (providerId: number) => {
    setSelectedProviders((prev) => prev.filter((id) => id !== providerId));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedProviders);
      onOpenChange(false);
      setSearchQuery("");
      setIsSearchOpen(false);
    } catch (error) {
      console.error("Failed to save providers:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-[38rem] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Select Your Services</DialogTitle>
        </DialogHeader>

        {/* Preview Carousel */}
        {selectedProviderObjects.length > 0 && (
          <div className="px-6 py-4 border-b">
            <div className="relative group/carousel">
              <Carousel
                opts={{
                  align: "start",
                  slidesToScroll: 1,
                  dragFree: true,
                  breakpoints: {
                    "(max-width: 640px)": { slidesToScroll: 1, dragFree: true },
                    "(min-width: 641px)": { slidesToScroll: 2, dragFree: true },
                    "(min-width: 1025px)": { slidesToScroll: 3, dragFree: true },
                  },
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 sm:-ml-3 py-2.5">
                  {selectedProviderObjects.map((provider) => (
                    <CarouselItem
                      key={provider.provider_id}
                      className="pl-2 sm:pl-3 basis-auto"
                    >
                      <div className="relative">
                        <button
                          className="cursor-pointer rounded-lg p-0 h-10 w-10 transition-colors flex items-center justify-center overflow-hidden relative bg-background border border-black/10 dark:border-border"
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
                        </button>
                        <button
                          onClick={() => handleRemoveFromPreview(provider.provider_id)}
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-0 h-full w-[45px] rounded-l-md rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10" />
                <CarouselNext className="right-0 h-full w-[45px] rounded-r-md rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10" />
              </Carousel>
            </div>
          </div>
        )}

        {/* Filter Bar / Search */}
        <div className="px-6 py-4 border-b space-y-3">
          {/* Region Dropdown */}
          {watchRegions.length > 0 && (
            <Popover
              open={countryOpen}
              onOpenChange={(open) => {
                setCountryOpen(open);
                if (!open) setCountrySearch("");
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="w-full justify-between cursor-pointer"
                  style={{ fontSize: "14px" }}
                >
                  <span className="flex items-center gap-2 truncate" style={{ fontSize: "14px" }}>
                    <span className="text-lg shrink-0">{getCountryFlagEmoji(watchRegion)}</span>
                    <span className="truncate">{watchRegions.find((r) => r.iso_3166_1 === watchRegion)?.english_name ?? watchRegion}</span>
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]" 
                align="end"
              >
                <Command shouldFilter={false} className="rounded-lg border-0 bg-transparent">
                  <CommandInput
                    placeholder="Search country..."
                    value={countrySearch}
                    onValueChange={setCountrySearch}
                  />
                  <CommandList className="max-h-[300px] scroll-smooth">
                    {filteredWatchRegions.length === 0 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">No country found.</div>
                    )}
                    <CommandGroup forceMount className="p-1">
                      {filteredWatchRegions.map((region) => {
                        const isSelected = watchRegion === region.iso_3166_1;
                        return (
                          <CommandItem
                            key={region.iso_3166_1}
                            value={region.iso_3166_1}
                            forceMount
                            onSelect={() => {
                              handleRegionChange(region.iso_3166_1);
                              setCountryOpen(false);
                              setCountrySearch("");
                            }}
                            className="cursor-pointer gap-2"
                            style={{ fontSize: "14px" }}
                          >
                            <span className="text-lg shrink-0">{getCountryFlagEmoji(region.iso_3166_1)}</span>
                            <span className="flex-1 truncate" style={{ fontSize: "14px" }}>{region.english_name}</span>
                            {isSelected && <Check className="size-4 shrink-0" />}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          
          <div className="flex items-center gap-2">
            {!isSearchOpen ? (
              <>
                {/* Quick Filter Buttons */}
                <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setProviderTypeFilter("all")}
                    className={cn(
                      "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors",
                      providerTypeFilter === "all"
                        ? "bg-blue-50 text-foreground dark:bg-accent"
                        : "bg-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All
                  </button>
                  {availableTypes.flatrate && (
                    <button
                      onClick={() => setProviderTypeFilter("flatrate")}
                      className={cn(
                        "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors",
                        providerTypeFilter === "flatrate"
                          ? "bg-blue-50 text-foreground dark:bg-accent"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Subscriptions
                    </button>
                  )}
                  {availableTypes.buy && (
                    <button
                      onClick={() => setProviderTypeFilter("buy")}
                      className={cn(
                        "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors",
                        providerTypeFilter === "buy"
                          ? "bg-blue-50 text-foreground dark:bg-accent"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Buy
                    </button>
                  )}
                  {availableTypes.rent && (
                    <button
                      onClick={() => setProviderTypeFilter("rent")}
                      className={cn(
                        "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors",
                        providerTypeFilter === "rent"
                          ? "bg-blue-50 text-foreground dark:bg-accent"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Rent
                    </button>
                  )}
                  {availableTypes.free && (
                    <button
                      onClick={() => setProviderTypeFilter("free")}
                      className={cn(
                        "h-9 px-4 rounded-[25px] border-none flex-shrink-0 cursor-pointer transition-colors",
                        providerTypeFilter === "free"
                          ? "bg-blue-50 text-foreground dark:bg-accent"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Free
                    </button>
                  )}
                </div>
                {/* Search Icon */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(true)}
                  className="h-9 w-9 flex-shrink-0 cursor-pointer"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-8"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="absolute right-0 top-0 h-full w-8 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Provider List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-0">
            {filteredProviders.map((provider, index) => (
              <div key={provider.provider_id}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {provider.logo_path ? (
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                          alt={provider.provider_name}
                          fill
                          className="object-contain rounded-lg"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xs flex-shrink-0">
                        {provider.provider_name[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium truncate">{provider.provider_name}</span>
                  </div>
                  <Checkbox
                    checked={selectedProviders.includes(provider.provider_id)}
                    onCheckedChange={() => handleToggleProvider(provider.provider_id)}
                    className="cursor-pointer data-[state=checked]:!bg-red-500 data-[state=checked]:!border-red-500 data-[state=checked]:text-white"
                  />
                </div>
                {index < filteredProviders.length - 1 && (
                  <div className="h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer with Save Button */}
        <div className="px-6 py-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-10 font-bold text-base cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
