import { useQuery } from "@tanstack/react-query";

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

async function fetchWatchProviders(region?: string, allProviders = false): Promise<WatchProvider[]> {
  const searchParams = new URLSearchParams();
  if (region) searchParams.set("region", region);
  if (allProviders) searchParams.set("limit", "all");
  const qs = searchParams.toString();
  const url = `/api/watch-providers${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch watch providers");
  const data = await res.json();
  return data.providers ?? [];
}

export function useWatchProviders(region: string = "US", options?: { all?: boolean }) {
  const allProviders = options?.all ?? false;
  return useQuery({
    queryKey: ["watch-providers", region, allProviders ? "all" : "top"],
    queryFn: () => fetchWatchProviders(region, allProviders),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}
