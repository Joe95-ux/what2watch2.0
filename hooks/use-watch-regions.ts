import { useQuery } from "@tanstack/react-query";

export interface WatchRegion {
  iso_3166_1: string;
  english_name: string;
}

async function fetchWatchRegions(): Promise<WatchRegion[]> {
  const res = await fetch("/api/watch-providers/regions");
  if (!res.ok) throw new Error("Failed to fetch watch regions");
  const data = await res.json();
  return data.results ?? [];
}

export function useWatchRegions() {
  return useQuery({
    queryKey: ["watch-providers-regions"],
    queryFn: fetchWatchRegions,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}

/** ISO 3166-1 alpha-2 code used for flag emoji (e.g. UK -> GB) */
const FLAG_CODE_ALIASES: Record<string, string> = {
  UK: "GB", // United Kingdom; ISO uses GB for the flag
};

/** Convert ISO 3166-1 alpha-2 code to flag emoji (e.g. "US" -> "🇺🇸", "UK" -> "🇬🇧") */
export function getCountryFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "";
  const normalized = FLAG_CODE_ALIASES[code.toUpperCase()] ?? code.toUpperCase();
  return normalized
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}
