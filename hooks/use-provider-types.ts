import { useQuery } from "@tanstack/react-query";

interface ProviderTypes {
  flatrate: Set<number>;
  buy: Set<number>;
  rent: Set<number>;
  free: Set<number>;
  ads: Set<number>;
}

async function fetchProviderTypes(region: string = "US"): Promise<ProviderTypes> {
  // Fetch watch providers for a few popular movies/TV shows to determine provider types
  // Using popular titles to get a good sample of providers
  const popularMovies = [550, 238, 424, 129, 497]; // Fight Club, The Godfather, Schindler's List, Spirited Away, The Green Mile
  const popularTV = [1396, 1399, 48866, 1398, 48891]; // Breaking Bad, Game of Thrones, The Office, Sons of Anarchy, The Walking Dead

  const types: ProviderTypes = {
    flatrate: new Set<number>(),
    buy: new Set<number>(),
    rent: new Set<number>(),
    free: new Set<number>(),
    ads: new Set<number>(),
  };

  try {
    // Fetch providers for popular movies
    const moviePromises = popularMovies.map((id) =>
      fetch(`/api/movies/${id}/watch-providers`)
        .then((res) => res.json())
        .catch(() => null)
    );

    // Fetch providers for popular TV shows
    const tvPromises = popularTV.map((id) =>
      fetch(`/api/tv/${id}/watch-providers`)
        .then((res) => res.json())
        .catch(() => null)
    );

    const results = await Promise.all([...moviePromises, ...tvPromises]);

    results.forEach((data) => {
      if (!data?.results) return;
      const regionData = data.results[region] || data.results["US"] || Object.values(data.results)[0];
      if (!regionData) return;

      // Aggregate providers by type
      regionData.flatrate?.forEach((p: { provider_id: number }) => {
        types.flatrate.add(p.provider_id);
      });
      regionData.buy?.forEach((p: { provider_id: number }) => {
        types.buy.add(p.provider_id);
      });
      regionData.rent?.forEach((p: { provider_id: number }) => {
        types.rent.add(p.provider_id);
      });
      regionData.ads?.forEach((p: { provider_id: number }) => {
        types.ads.add(p.provider_id);
      });
      // Free providers include ads providers and some flatrate providers that are free
      regionData.free?.forEach((p: { provider_id: number }) => {
        types.free.add(p.provider_id);
      });
    });

    // Also include ads providers in free category
    types.ads.forEach((id) => types.free.add(id));
  } catch (error) {
    console.error("Failed to fetch provider types:", error);
  }

  return types;
}

export function useProviderTypes(region: string = "US") {
  return useQuery({
    queryKey: ["provider-types", region],
    queryFn: () => fetchProviderTypes(region),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}
