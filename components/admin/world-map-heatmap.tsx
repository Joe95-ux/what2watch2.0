"use client";

import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import countriesLib from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import { useTheme } from "next-themes";

// Register locale ONCE
countriesLib.registerLocale(en);

// Correct geography URL for react-simple-maps
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryData {
  country: string; // ISO_A2 in DB (US, SZ)
  views: number;
}

interface WorldMapHeatmapProps {
  countries: CountryData[];
  maxViews?: number;
}

// Get color intensity based on views
function getColorIntensity(views: number, maxViews: number, isDark: boolean): string {
  if (maxViews === 0) return isDark ? "#374151" : "#f3f4f6";

  const intensity = views / maxViews;

  if (intensity === 0) return isDark ? "#374151" : "#f3f4f6";
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

  /**
   * 🔑 KEY FIX:
   * Convert ISO_A2 (DB) → ISO_A3 (map)
   */
  const countryMap = useMemo(() => {
    const map = new Map<string, number>();

    countries.forEach(({ country, views }) => {
      const isoA2 = country.toUpperCase().trim();
      const isoA3 = countriesLib.alpha2ToAlpha3(isoA2);

      if (isoA3) {
        map.set(isoA3, views);
      }
    });

    return map;
  }, [countries]);

  const calculatedMaxViews =
    maxViews || (countries.length > 0 ? Math.max(...countries.map((c) => c.views)) : 0);

  const handleMouseEnter = (geo: any, event: React.MouseEvent) => {
    const isoA3 = geo.properties.ISO_A3 as string | undefined;
    if (!isoA3) return;

    const views = countryMap.get(isoA3) || 0;
    const countryName =
      countriesLib.getName(isoA3, "en") ||
      geo.properties.NAME ||
      isoA3;

    setHoveredCountry(isoA3);
    setTooltipContent(`${countryName}: ${views.toLocaleString()} ${views === 1 ? "view" : "views"}`);
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
          minHeight: "450px",
          backgroundColor: isDark ? "#111827" : "#f9fafb",
          borderColor: isDark ? "#374151" : "#e5e7eb",
        }}
        onMouseMove={handleMouseMove}
      >
        <ComposableMap
          projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup zoom={1} center={[0, 0]}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const isoA3 = geo.properties.ISO_A3 as string | undefined;
                  if (!isoA3) return null;

                  const views = countryMap.get(isoA3) || 0;
                  const fillColor = getColorIntensity(views, calculatedMaxViews, isDark);
                  const isHovered = hoveredCountry === isoA3;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isHovered ? (isDark ? "#60a5fa" : "#3b82f6") : fillColor}
                      stroke={isDark ? "#1f2937" : "#d1d5db"}
                      strokeWidth={0.5}
                      onMouseEnter={(e) => handleMouseEnter(geo, e)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        default: { outline: "none", cursor: "pointer" },
                        hover: { outline: "none", cursor: "pointer" },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

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
          >
            {tooltipContent}
          </div>
        )}
      </div>
    </div>
  );
}
