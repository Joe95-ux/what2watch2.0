"use client";

import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useTheme } from "next-themes";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryData {
  country: string; // Could be code (US) or name (United States)
  views: number;
}

interface WorldMapHeatmapProps {
  countries: CountryData[];
  maxViews?: number;
}

// Enhanced mapping with common variations
const COUNTRY_MAPPINGS: Record<string, string> = {
  // ISO A2 codes to names
  'US': 'United States',
  'GB': 'United Kingdom',
  'UK': 'United Kingdom', // Common alternative
  'CA': 'Canada',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'CZ': 'Czechia', // Note: Map uses "Czechia" not "Czech Republic"
  'IE': 'Ireland',
  'PT': 'Portugal',
  'GR': 'Greece',
  'HU': 'Hungary',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'HR': 'Croatia',
  'SK': 'Slovakia',
  'SI': 'Slovenia',
  'LT': 'Lithuania',
  'LV': 'Latvia',
  'EE': 'Estonia',
  'JP': 'Japan',
  'CN': 'China',
  'KR': 'South Korea',
  'IN': 'India',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'IL': 'Israel',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'TR': 'Turkey',
  'RU': 'Russia',
  'UA': 'Ukraine',
  'NZ': 'New Zealand',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'TH': 'Thailand',
  'PH': 'Philippines',
  'ID': 'Indonesia',
  'VN': 'Vietnam',
  'SZ': 'Eswatini',
  
  // Also map names to codes for reverse lookup
  'United States': 'US',
  'United Kingdom': 'GB',
  'Canada': 'CA',
  'Australia': 'AU',
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Ireland': 'IE',
  'Portugal': 'PT',
  'Greece': 'GR',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Croatia': 'HR',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Lithuania': 'LT',
  'Latvia': 'LV',
  'Estonia': 'EE',
  'Japan': 'JP',
  'China': 'CN',
  'South Korea': 'KR',
  'India': 'IN',
  'Brazil': 'BR',
  'Mexico': 'MX',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'South Africa': 'ZA',
  'Egypt': 'EG',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  'Israel': 'IL',
  'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA',
  'Turkey': 'TR',
  'Russia': 'RU',
  'Ukraine': 'UA',
  'New Zealand': 'NZ',
  'Singapore': 'SG',
  'Malaysia': 'MY',
  'Thailand': 'TH',
  'Philippines': 'PH',
  'Indonesia': 'ID',
  'Vietnam': 'VN',
  'Eswatini': 'SZ',
};

// Get color intensity based on views
function getColorIntensity(views: number, maxViews: number, isDark: boolean): string {
  if (maxViews === 0 || views === 0) return isDark ? "#374151" : "#f3f4f6";
  
  const intensity = views / maxViews;
  
  if (intensity < 0.1) return isDark ? "#3b82f6" : "#93c5fd";
  if (intensity < 0.3) return isDark ? "#2563eb" : "#60a5fa";
  if (intensity < 0.5) return isDark ? "#1d4ed8" : "#3b82f6";
  if (intensity < 0.7) return isDark ? "#1e40af" : "#1d4ed8";
  return isDark ? "#1e3a8a" : "#1e40af";
}

export function WorldMapHeatmap({ countries, maxViews }: WorldMapHeatmapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  // Create a normalized map of country codes to views
  const countryMap = useMemo(() => {
    const map = new Map<string, number>();
    
    countries.forEach(({ country, views }) => {
      if (!country) return;
      
      // Normalize the country identifier
      const normalized = country.trim().toUpperCase();
      
      // Try multiple strategies to match the country
      
      // 1. Direct code match (if provided code matches map's ISO_A2)
      map.set(normalized, views);
      
      // 2. If it's a name, try to convert to code
      const codeFromName = COUNTRY_MAPPINGS[normalized] || 
                          Object.entries(COUNTRY_MAPPINGS).find(
                            ([key, value]) => 
                              key.toUpperCase() === normalized || 
                              value.toUpperCase() === normalized
                          )?.[1];
      
      if (codeFromName) {
        map.set(codeFromName.toUpperCase(), views);
      }
      
      // 3. Also store by lowercase name for fallback matching
      const countryName = COUNTRY_MAPPINGS[normalized] || normalized;
      map.set(countryName.toLowerCase(), views);
    });
    
    return map;
  }, [countries]);

  // Calculate max views
  const calculatedMaxViews = maxViews || 
    (countries.length > 0 ? Math.max(...countries.map((c) => c.views)) : 0);

  const handleMouseEnter = (geo: any, event: React.MouseEvent) => {
    const countryCode = geo.properties.ISO_A2;
    const countryName = geo.properties.NAME;
    
    if (!countryCode && !countryName) return;
    
    setHoveredCountry(countryCode);
    
    // Try multiple ways to find the views
    let views = 0;
    
    // 1. Try by country code
    if (countryCode) {
      views = countryMap.get(countryCode.toUpperCase()) || 0;
    }
    
    // 2. Try by country name
    if (views === 0 && countryName) {
      views = countryMap.get(countryName.toLowerCase()) || 0;
      
      // 3. Try by mapped name
      if (views === 0) {
        const mappedCode = COUNTRY_MAPPINGS[countryName];
        if (mappedCode) {
          views = countryMap.get(mappedCode.toUpperCase()) || 0;
        }
      }
    }
    
    const displayName = COUNTRY_MAPPINGS[countryCode] || countryName || countryCode;
    setTooltipContent(`${displayName}: ${views.toLocaleString()} ${views === 1 ? "view" : "views"}`);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredCountry(null);
    setTooltipContent("");
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (tooltipContent) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
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
        onMouseMove={handleMouseMove}
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
                  const countryName = geo.properties.NAME;
                  
                  if (!countryCode && !countryName) {
                    // Small territories without codes
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={isDark ? "#2a2a2a" : "#f0f0f0"}
                        stroke={isDark ? "#374151" : "#d1d5db"}
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none" },
                        }}
                      />
                    );
                  }
                  
                  // Try to find views for this country
                  let views = 0;
                  const normalizedCode = countryCode?.toUpperCase();
                  const normalizedName = countryName?.toLowerCase();
                  
                  // Check by code first
                  if (normalizedCode) {
                    views = countryMap.get(normalizedCode) || 0;
                  }
                  
                  // Check by name if no views found by code
                  if (views === 0 && normalizedName) {
                    views = countryMap.get(normalizedName) || 0;
                    
                    // Try mapped code
                    if (views === 0) {
                      const mappedCode = COUNTRY_MAPPINGS[countryName];
                      if (mappedCode) {
                        views = countryMap.get(mappedCode.toUpperCase()) || 0;
                      }
                    }
                  }
                  
                  const fillColor = getColorIntensity(views, calculatedMaxViews, isDark);
                  const isHovered = hoveredCountry === countryCode;
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isHovered ? (isDark ? "#60a5fa" : "#3b82f6") : fillColor}
                      stroke={isDark ? "#1f2937" : "#d1d5db"}
                      strokeWidth={0.5}
                      onMouseEnter={(event) => handleMouseEnter(geo, event)}
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
              maxWidth: '200px',
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

// Export the mapping for use in the table
export const COUNTRY_NAMES = Object.fromEntries(
  Object.entries(COUNTRY_MAPPINGS).filter(([key, value]) => key.length === 2)
) as Record<string, string>;