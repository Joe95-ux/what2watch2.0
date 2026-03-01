"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WatchProvider } from "@/hooks/use-watch-providers";

interface ProviderButtonProps {
  providers: WatchProvider[];
  onClick: () => void;
}

export function ProviderButton({ providers, onClick }: ProviderButtonProps) {
  // Get first 4 providers for display
  const displayProviders = providers.slice(0, 4);
  
  if (displayProviders.length === 0) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="relative h-10 px-2 cursor-pointer"
    >
      <div className="flex items-center -space-x-2">
        {displayProviders.map((provider, index) => (
          <div
            key={provider.provider_id}
            className={cn(
              "relative rounded-lg overflow-hidden",
              "h-8 w-8 flex-shrink-0"
            )}
            style={{ zIndex: displayProviders.length - index }}
          >
            {provider.logo_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
                alt={provider.provider_name}
                title={provider.provider_name}
                fill
                className="object-contain rounded-lg"
                unoptimized
              />
            ) : (
              <div className="h-full w-full bg-muted flex items-center justify-center text-xs">
                {provider.provider_name[0]}
              </div>
            )}
          </div>
        ))}
      </div>
    </Button>
  );
}
