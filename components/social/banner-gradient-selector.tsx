"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// 6 Beautiful abstract gradients
export const BANNER_GRADIENTS = [
  {
    id: "gradient-1",
    name: "Ocean Depths",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    id: "gradient-2",
    name: "Sunset Horizon",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    id: "gradient-3",
    name: "Forest Canopy",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    id: "gradient-4",
    name: "Desert Dunes",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    id: "gradient-5",
    name: "Purple Haze",
    gradient: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
  },
  {
    id: "gradient-6",
    name: "Emerald Dream",
    gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  },
];

interface BannerGradientSelectorProps {
  selectedGradient?: string;
  onSelect: (gradient: string) => void;
}

export default function BannerGradientSelector({
  selectedGradient,
  onSelect,
}: BannerGradientSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {BANNER_GRADIENTS.map((gradient) => {
        const isSelected = selectedGradient === gradient.id;
        return (
          <button
            key={gradient.id}
            onClick={() => onSelect(gradient.id)}
            className={cn(
              "relative aspect-video rounded-lg overflow-hidden border-2 transition-all",
              "hover:scale-105 hover:shadow-lg",
              isSelected
                ? "border-primary shadow-md"
                : "border-border hover:border-primary/50"
            )}
            style={{ background: gradient.gradient }}
          >
            {isSelected && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="bg-primary text-primary-foreground rounded-full p-2">
                  <Check className="h-5 w-5" />
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/40 backdrop-blur-sm">
              <p className="text-xs text-white font-medium text-center">
                {gradient.name}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

