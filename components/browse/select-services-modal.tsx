"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import Image from "next/image";
import type { WatchProvider } from "@/hooks/use-watch-providers";

interface SelectServicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: WatchProvider[];
  selectedProviders: number[];
  onSave: (providerIds: number[]) => Promise<void>;
}

type ProviderTypeFilter = "all" | "flatrate" | "buy" | "rent" | "free" | "ads";

export function SelectServicesModal({
  open,
  onOpenChange,
  providers,
  selectedProviders: initialSelected,
  onSave,
}: SelectServicesModalProps) {
  const [selectedProviders, setSelectedProviders] = useState<number[]>(initialSelected);
  const [providerTypeFilter, setProviderTypeFilter] = useState<ProviderTypeFilter>("all");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Filter providers based on type and search
  const filteredProviders = useMemo(() => {
    let filtered = providers;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter((p) =>
        p.provider_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Note: Provider type filtering would require additional data from JustWatch/TMDB
    // For now, we'll just return all providers
    return filtered;
  }, [providers, searchQuery, providerTypeFilter]);

  // Get selected provider objects for preview
  const selectedProviderObjects = useMemo(() => {
    return providers.filter((p) => selectedProviders.includes(p.provider_id));
  }, [providers, selectedProviders]);

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
      <DialogContent className="max-w-full sm:max-w-[38rem] max-h-[90vh] flex flex-col p-0">
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
                <CarouselContent className="-ml-2 sm:-ml-3">
                  {selectedProviderObjects.map((provider) => (
                    <CarouselItem
                      key={provider.provider_id}
                      className="pl-2 sm:pl-3 basis-auto"
                    >
                      <div className="relative">
                        <button
                          className="cursor-pointer rounded-lg border-0 p-0 h-10 w-10 transition-colors flex items-center justify-center overflow-hidden relative bg-primary"
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
                <CarouselPrevious className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10" />
                <CarouselNext className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10" />
              </Carousel>
            </div>
          </div>
        )}

        {/* Filter Bar / Search */}
        <div className="px-6 py-4 border-b">
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
                          className="object-contain p-1.5"
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
                    className="cursor-pointer data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 data-[state=checked]:text-white"
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
        <div className="px-6 py-4 border-t flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
