import { useQuery } from "@tanstack/react-query";

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

async function fetchWatchProviders(
  region?: string,
  options?: { all?: boolean; limit?: number }
): Promise<WatchProvider[]> {
  const searchParams = new URLSearchParams();
  if (region) searchParams.set("region", region);
  if (options?.all) searchParams.set("limit", "all");
  else if (typeof options?.limit === "number" && options.limit > 0)
    searchParams.set("limit", String(options.limit));
  const qs = searchParams.toString();
  const url = `/api/watch-providers${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch watch providers");
  const data = await res.json();
  return data.providers ?? [];
}

export function useWatchProviders(region: string = "US", options?: { all?: boolean; limit?: number }) {
  const cacheKey = options?.all ? "all" : typeof options?.limit === "number" ? options.limit : "top";
  return useQuery({
    queryKey: ["watch-providers", region, cacheKey],
    queryFn: () => fetchWatchProviders(region, options),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}
