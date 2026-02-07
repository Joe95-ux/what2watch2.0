import { useQuery } from "@tanstack/react-query";

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

async function fetchWatchProviders(region?: string): Promise<WatchProvider[]> {
  const params = region ? `?region=${encodeURIComponent(region)}` : "";
  const res = await fetch(`/api/watch-providers${params}`);
  if (!res.ok) throw new Error("Failed to fetch watch providers");
  const data = await res.json();
  return data.providers ?? [];
}

export function useWatchProviders(region: string = "US") {
  return useQuery({
    queryKey: ["watch-providers", region],
    queryFn: () => fetchWatchProviders(region),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}
