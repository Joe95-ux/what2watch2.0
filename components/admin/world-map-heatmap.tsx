"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryData {
  country: string;
  views: number;
}

interface WorldMapHeatmapProps {
  countries: CountryData[];
  maxViews?: number;
}

// Get color intensity based on views
function getColorIntensity(views: number, maxViews: number): string {
  if (maxViews === 0) return "#e0e0e0";
  
  const intensity = views / maxViews;
  
  if (intensity === 0) return "#e0e0e0"; // No data - light gray
  if (intensity < 0.1) return "#cfe2f3"; // Very low - light blue
  if (intensity < 0.3) return "#9fc5e8"; // Low - medium blue
  if (intensity < 0.5) return "#6fa8dc"; // Medium - blue
  if (intensity < 0.7) return "#3d85c6"; // High - dark blue
  return "#0b5394"; // Very high - darkest blue
}

export function WorldMapHeatmap({ countries, maxViews }: WorldMapHeatmapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  
  // Create a map of country codes to views
  const countryMap = new Map<string, number>();
  countries.forEach(({ country, views }) => {
    if (country) {
      countryMap.set(country.toUpperCase(), views);
    }
  });

  // Calculate max views if not provided
  const calculatedMaxViews = maxViews || Math.max(...countries.map((c) => c.views), 0);

  return (
    <TooltipProvider>
      <div className="w-full h-full">
        <ComposableMap
          projectionConfig={{
            scale: 147,
            center: [0, 20],
          }}
          className="w-full"
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryCode = geo.properties.ISO_A2;
                const views = countryMap.get(countryCode) || 0;
                const fillColor = hoveredCountry === countryCode 
                  ? "#ff6b6b" 
                  : getColorIntensity(views, calculatedMaxViews);
                const countryName = geo.properties.NAME || countryCode;

                return (
                  <Tooltip key={geo.rsmKey}>
                    <TooltipTrigger asChild>
                      <Geography
                        geography={geo}
                        fill={fillColor}
                        stroke="#ffffff"
                        strokeWidth={0.5}
                        onMouseEnter={() => setHoveredCountry(countryCode)}
                        onMouseLeave={() => setHoveredCountry(null)}
                        style={{
                          default: {
                            outline: "none",
                            cursor: "pointer",
                          },
                          hover: {
                            outline: "none",
                            cursor: "pointer",
                          },
                          pressed: {
                            outline: "none",
                          },
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-semibold">{countryName}</p>
                        <p className="text-sm text-muted-foreground">
                          {views.toLocaleString()} {views === 1 ? "view" : "views"}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            }
          </Geographies>
        </ComposableMap>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#e0e0e0" }} />
            <span>No data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#cfe2f3" }} />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#6fa8dc" }} />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#0b5394" }} />
            <span>High</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

