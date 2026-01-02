"use client";

import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useTheme } from "next-themes";

// Correct geography URL for react-simple-maps
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryData {
  country: string;
  views: number;
}

interface WorldMapHeatmapProps {
  countries: CountryData[];
  maxViews?: number;
}

// Country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  BE: "Belgium",
  CH: "Switzerland",
  AT: "Austria",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  CZ: "Czechia",
  IE: "Ireland",
  PT: "Portugal",
  GR: "Greece",
  HU: "Hungary",
  RO: "Romania",
  BG: "Bulgaria",
  HR: "Croatia",
  SK: "Slovakia",
  SI: "Slovenia",
  LT: "Lithuania",
  LV: "Latvia",
  EE: "Estonia",
  JP: "Japan",
  CN: "China",
  KR: "South Korea",
  IN: "India",
  BR: "Brazil",
  MX: "Mexico",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  ZA: "South Africa",
  EG: "Egypt",
  NG: "Nigeria",
  KE: "Kenya",
  IL: "Israel",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  TR: "Turkey",
  RU: "Russia",
  UA: "Ukraine",
  NZ: "New Zealand",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thailand",
  PH: "Philippines",
  ID: "Indonesia",
  VN: "Vietnam",
  SZ: "Eswatini",
};

// Get color intensity based on views - improved for better contrast
function getColorIntensity(views: number, maxViews: number, isDark: boolean): string {
  if (maxViews === 0) return isDark ? "#374151" : "#f3f4f6"; // Better contrast
  
  const intensity = views / maxViews;
  
  // Blue color scale that works well on both themes
  if (intensity === 0) return isDark ? "#374151" : "#f3f4f6";
  if (intensity < 0.1) return isDark ? "#3b82f6" : "#93c5fd"; // Blue-400/Blue-300
  if (intensity < 0.3) return isDark ? "#2563eb" : "#60a5fa"; // Blue-600/Blue-400
  if (intensity < 0.5) return isDark ? "#1d4ed8" : "#3b82f6"; // Blue-700/Blue-500
  if (intensity < 0.7) return isDark ? "#1e40af" : "#1d4ed8"; // Blue-800/Blue-700
  return isDark ? "#1e3a8a" : "#1e40af"; // Blue-900/Blue-800
}

export function WorldMapHeatmap({ countries, maxViews }: WorldMapHeatmapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Create a map of country codes to views - handle various formats
  const countryMap = useMemo(() => {
    const map = new Map<string, number>();
    
    countries.forEach(({ country, views }) => {
      if (country) {
        const upperCountry = country.toUpperCase().trim();
        // Store by the code as-is (should be ISO_A2 like "US", "SZ")
        map.set(upperCountry, views);
        
        // Also try to find by country name and map to code
        const countryEntry = Object.entries(COUNTRY_NAMES).find(
          ([_, name]) => name.toLowerCase() === country.toLowerCase()
        );
        if (countryEntry) {
          map.set(countryEntry[0], views);
        }
      }
    });
    
    return map;
  }, [countries]);

  // Calculate max views if not provided
  const calculatedMaxViews = maxViews || 
    (countries.length > 0 ? Math.max(...countries.map((c) => c.views)) : 0);

  const handleMouseEnter = (geo: any, event: React.MouseEvent<SVGPathElement>) => {
    const countryCode = geo.properties.ISO_A2;
    if (countryCode) {
      const upperCode = countryCode.toUpperCase();
      const views = countryMap.get(upperCode) || 0;
      const countryName = geo.properties.NAME || geo.properties.name || countryCode;
      setHoveredCountry(upperCode);
      setTooltipContent(`${countryName}: ${views.toLocaleString()} ${views === 1 ? "view" : "views"}`);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };
  
  const handleMouseMove = (event: React.MouseEvent<SVGPathElement>) => {
    if (tooltipContent) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCountry(null);
    setTooltipContent("");
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      <div 
        className="relative flex-1 rounded-lg overflow-hidden border"
        style={{ 
          width: "100%", 
          height: "100%", 
          minHeight: "450px",
          backgroundColor: isDark ? "#111827" : "#f9fafb",
          borderColor: isDark ? "#374151" : "#e5e7eb"
        }}
      >
        <ComposableMap
          projectionConfig={{
            rotate: [-10, 0, 0],
            scale: 147,
          }}
          style={{ 
            width: "100%", 
            height: "100%",
            backgroundColor: isDark ? "#111827" : "#f9fafb"
          }}
        >
          <ZoomableGroup zoom={1} center={[0, 0]}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const countryCode = geo.properties.ISO_A2;
                  if (!countryCode) {
                    return null;
                  }
                  
                  const countryName = geo.properties.NAME || geo.properties.name || countryCode;
                  const upperCode = countryCode.toUpperCase();
                  
                  // Get views - match by ISO_A2 code
                  const views = countryMap.get(upperCode) || 0;
                  
                  const fillColor = getColorIntensity(views, calculatedMaxViews, isDark);
                  const isHovered = hoveredCountry === upperCode;
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isHovered ? (isDark ? "#60a5fa" : "#3b82f6") : fillColor}
                      stroke={isDark ? "#1f2937" : "#d1d5db"}
                      strokeWidth={0.5}
                      onMouseEnter={(event) => {
                        handleMouseEnter(geo, event);
                      }}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        default: {
                          outline: "none",
                          cursor: "pointer",
                          transition: "fill 0.2s ease",
                        },
                        hover: {
                          outline: "none",
                          cursor: "pointer",
                          fill: isDark ? "#60a5fa" : "#3b82f6",
                        },
                        pressed: {
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
        
        {/* Tooltip */}
        {tooltipContent && (
          <div 
            className="fixed z-50 px-3 py-2 text-sm rounded-md shadow-lg pointer-events-none"
            style={{
              left: `${tooltipPosition.x + 10}px`,
              top: `${tooltipPosition.y - 40}px`,
              backgroundColor: isDark ? "#1f2937" : "#ffffff",
              color: isDark ? "#f9fafb" : "#111827",
              border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
            }}
          >
            {tooltipContent}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm flex-shrink-0 px-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border" 
            style={{ 
              backgroundColor: isDark ? "#374151" : "#f3f4f6",
              borderColor: isDark ? "#4b5563" : "#d1d5db"
            }} 
          />
          <span className={isDark ? "text-gray-300" : "text-gray-600"}>No data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: isDark ? "#3b82f6" : "#93c5fd" }} />
          <span className={isDark ? "text-gray-300" : "text-gray-600"}>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: isDark ? "#1d4ed8" : "#3b82f6" }} />
          <span className={isDark ? "text-gray-300" : "text-gray-600"}>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: isDark ? "#1e3a8a" : "#1e40af" }} />
          <span className={isDark ? "text-gray-300" : "text-gray-600"}>High</span>
        </div>
      </div>
    </div>
  );
}

export { COUNTRY_NAMES };