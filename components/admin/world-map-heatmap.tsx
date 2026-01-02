"use client";

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import "leaflet/dist/leaflet.css";

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

// Component to handle map initialization
function MapInitializer() {
  const map = useMap();
  
  useEffect(() => {
    // Fit bounds to show the world
    map.setView([20, 0], 2);
  }, [map]);
  
  return null;
}

export function WorldMapHeatmap({ countries, maxViews }: WorldMapHeatmapProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  
  // Create maps of country codes and names to views
  const countryMap = useMemo<{ codeMap: Map<string, number>; nameMap: Map<string, number> }>(() => {
    const codeMap = new Map<string, number>();
    const nameMap = new Map<string, number>();
    
    countries.forEach(({ country, views }) => {
      if (country) {
        const upperCountry = country.toUpperCase().trim();
        // Store by code (assuming it's already a 2-letter code)
        if (upperCountry.length === 2) {
          codeMap.set(upperCountry, views);
        }
        // Also store by name for fallback matching
        nameMap.set(upperCountry, views);
        // Store original case too
        nameMap.set(country.trim(), views);
      }
    });
    
    return { codeMap, nameMap };
  }, [countries]);

  // Calculate max views if not provided
  const calculatedMaxViews = maxViews || Math.max(...countries.map((c) => c.views), 0);

  // Load GeoJSON data
  useEffect(() => {
    // Using a proper GeoJSON source for world countries
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((res) => res.json())
      .then((data) => {
        // Validate it's a proper GeoJSON
        if (data && data.type === "FeatureCollection" && Array.isArray(data.features)) {
          setGeoJsonData(data);
        } else {
          console.error("Invalid GeoJSON format received");
        }
      })
      .catch((err) => {
        console.error("Failed to load GeoJSON:", err);
        // Fallback to alternative source
        fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
          .then((res) => res.json())
          .then((data) => {
            if (data && data.type === "FeatureCollection") {
              setGeoJsonData(data);
            }
          })
          .catch((fallbackErr) => console.error("Fallback GeoJSON load failed:", fallbackErr));
      });
  }, []);

  // Helper to get country code from feature properties (handles different GeoJSON formats)
  const getCountryCode = (properties: any): string | null => {
    return properties?.ISO_A2 || 
           properties?.iso_a2 || 
           properties?.ISO2 || 
           properties?.iso2 || 
           properties?.id || 
           properties?.ISO_A2_EH ||
           properties?.ISO_A3 ||
           properties?.iso_a3 ||
           null;
  };

  // Helper to get country name from feature properties
  const getCountryName = (properties: any, countryCode: string | null): string => {
    return properties?.NAME || 
           properties?.name || 
           properties?.NAME_LONG || 
           properties?.ADMIN ||
           properties?.admin ||
           countryCode || 
           "Unknown";
  };

  // Helper to get views for a country by matching code or name
  const getCountryViews = (countryCode: string | null, countryName: string): number => {
    if (!countryCode) return 0;
    
    const upperCode = countryCode.toUpperCase();
    // Try by code first
    if (countryMap.codeMap.has(upperCode)) {
      return countryMap.codeMap.get(upperCode) || 0;
    }
    
    // Try by name as fallback
    const upperName = countryName.toUpperCase();
    if (countryMap.nameMap.has(upperName)) {
      return countryMap.nameMap.get(upperName) || 0;
    }
    
    return 0;
  };

  // Style function for GeoJSON features
  const getStyle = (feature: any) => {
    const countryCode = getCountryCode(feature.properties);
    const countryName = getCountryName(feature.properties, countryCode);
    
    if (!countryCode) {
      return {
        fillColor: "#e0e0e0",
        fillOpacity: 0.3,
        color: "#ffffff",
        weight: 0.5,
        opacity: 1,
      };
    }
    
    const views = getCountryViews(countryCode, countryName);
    const fillColor = hoveredCountry === countryCode 
      ? "#ff6b6b" 
      : getColorIntensity(views, calculatedMaxViews);
    
    return {
      fillColor,
      fillOpacity: views > 0 ? 0.8 : 0.3,
      color: "#ffffff",
      weight: 0.5,
      opacity: 1,
    };
  };

  // Event handlers for GeoJSON
  const onEachFeature = (feature: any, layer: any) => {
    const countryCode = getCountryCode(feature.properties);
    if (!countryCode) return;
    
    const countryName = getCountryName(feature.properties, countryCode);
    const views = getCountryViews(countryCode, countryName);

    layer.on({
      mouseover: () => {
        setHoveredCountry(countryCode);
        layer.setStyle({
          fillOpacity: 1,
          weight: 2,
        });
      },
      mouseout: () => {
        setHoveredCountry(null);
        layer.setStyle({
          fillOpacity: 0.8,
          weight: 0.5,
        });
      },
    });

    // Add tooltip
    layer.bindTooltip(
      `<div style="text-align: center;">
        <strong>${countryName}</strong><br/>
        <span style="color: #666; font-size: 12px;">
          ${views.toLocaleString()} ${views === 1 ? "view" : "views"}
        </span>
      </div>`,
      {
        permanent: false,
        direction: "top",
        offset: [0, -5],
      }
    );
  };

  if (!geoJsonData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 overflow-hidden rounded-lg">
          <MapContainer
            center={[20, 0] as [number, number]}
            zoom={2}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
            scrollWheelZoom={true}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapInitializer />
            {geoJsonData && (
              <GeoJSON
                data={geoJsonData}
                style={getStyle}
                onEachFeature={onEachFeature}
              />
            )}
          </MapContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
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
