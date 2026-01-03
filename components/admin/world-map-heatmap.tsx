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
    'CZ': 'Czechia',
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
  
  // Create a map of country codes to views
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
        
        // Also handle case where country might be the full name
        // Check if it matches any value in COUNTRY_NAMES
        const reverseEntry = Object.entries(COUNTRY_NAMES).find(
          ([code, name]) => name.toLowerCase() === country.toLowerCase()
        );
        if (reverseEntry) {
          map.set(reverseEntry[0], views);
        }
      }
    });
    
    // Debug: log the country map
    console.log("Country Map:", Array.from(map.entries()));
    console.log("Countries data:", countries);
    
    return map;
  }, [countries]);

  // Calculate max views if not provided
  const calculatedMaxViews = maxViews || 
    (countries.length > 0 ? Math.max(...countries.map((c) => c.views)) : 0);

  const handleMouseEnter = (geo: any, event: React.MouseEvent) => {
    const countryCode = geo.properties.ISO_A2;
    if (countryCode) {
      const upperCode = countryCode.toUpperCase();
      let views = countryMap.get(upperCode) || 0;
      
      // If no views found by code, try by name
      if (views === 0) {
        const countryName = geo.properties.NAME || geo.properties.name;
        if (countryName) {
          const countryEntry = Object.entries(COUNTRY_NAMES).find(
            ([_, name]) => name.toLowerCase() === countryName.toLowerCase()
          );
          if (countryEntry) {
            views = countryMap.get(countryEntry[0]) || 0;
          }
        }
      }
      
      const countryName = geo.properties.NAME || geo.properties.name || countryCode;
      setHoveredCountry(upperCode);
      setTooltipContent(`${countryName}: ${views.toLocaleString()} ${views === 1 ? "view" : "views"}`);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
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
                  // Use ISO_A2 only (not ISO_A3) for consistency
                  const countryCode = geo.properties.ISO_A2;
                  if (!countryCode) {
                    return null;
                  }
                  
                  const countryName = geo.properties.NAME || geo.properties.name || countryCode;
                  const upperCode = countryCode.toUpperCase();
                  
                  // Get views - match by ISO_A2 code
                  let views = countryMap.get(upperCode) || 0;
                  
                  // If no views found by code, try by name
                  if (views === 0 && countryName) {
                    const countryEntry = Object.entries(COUNTRY_NAMES).find(
                      ([_, name]) => name.toLowerCase() === countryName.toLowerCase()
                    );
                    if (countryEntry) {
                      views = countryMap.get(countryEntry[0]) || 0;
                    }
                  }
                  
                  // Debug for US specifically
                  if (upperCode === "US" && views > 0) {
                    console.log(`US found with ${views} views`);
                  }
                  
                  const fillColor = getColorIntensity(views, calculatedMaxViews, isDark);
                  const isHovered = hoveredCountry === upperCode;
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isHovered ? (isDark ? "#60a5fa" : "#3b82f6") : fillColor}
                      stroke={isDark ? "#1f2937" : "#d1d5db"}
                      strokeWidth={0.5}
                      data-tooltip-id="map-tooltip"
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
           style={{
             position: "fixed",
             left: tooltipPosition.x + 12,
             top: tooltipPosition.y - 28,
             background: isDark ? "#1f2937" : "#ffffff",
             color: isDark ? "#f9fafb" : "#111827",
             border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
             padding: "6px 10px",
             fontSize: "0.875rem",
             borderRadius: "6px",
             pointerEvents: "none",
             zIndex: 9999,
             whiteSpace: "nowrap",
           }}
           id="map-tooltip"
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