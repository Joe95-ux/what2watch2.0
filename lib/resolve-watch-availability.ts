import {
  getMovieWatchProviders,
  getTVWatchProviders,
  type TMDBWatchProvider,
  type TMDBWatchProvidersResponse,
} from "@/lib/tmdb";
import {
  getJustWatchAvailability,
  type JustWatchAvailabilityResponse,
  type JustWatchOffer,
  type JustWatchMonetization,
} from "@/lib/justwatch";
import type { PickForTonightProvider } from "@/lib/pick-for-tonight-types";

function hasOffers(data: JustWatchAvailabilityResponse | null | undefined): boolean {
  return Boolean(data?.allOffers?.length);
}

function mapTmdbProviders(
  providers: TMDBWatchProvider[] | undefined,
  monetizationType: JustWatchMonetization
): JustWatchOffer[] {
  if (!providers?.length) return [];
  return providers.map((provider) => ({
    providerId: provider.provider_id,
    providerName: provider.provider_name,
    iconUrl: provider.logo_path ? `https://image.tmdb.org/t/p/original${provider.logo_path}` : null,
    monetizationType,
    retailPrice: null,
    currency: null,
    presentationType: null,
    standardWebUrl: null,
    deepLinkUrl: null,
  }));
}

async function tmdbWatchAvailability(
  type: "movie" | "tv",
  tmdbId: number,
  country: string
): Promise<JustWatchAvailabilityResponse | null> {
  try {
    const data: TMDBWatchProvidersResponse =
      type === "movie" ? await getMovieWatchProviders(tmdbId) : await getTVWatchProviders(tmdbId);
    const region =
      data.results?.[country] ||
      data.results?.[Object.keys(data.results || {})[0] as keyof typeof data.results];
    if (!region) return null;

    const grouped: Record<JustWatchMonetization, JustWatchOffer[]> = {
      flatrate: mapTmdbProviders(region.flatrate, "flatrate"),
      buy: mapTmdbProviders(region.buy, "buy"),
      rent: mapTmdbProviders(region.rent, "rent"),
      ads: [],
      free: [],
      cinema: [],
      other: [],
    };
    const allOffers = Object.values(grouped).flat();
    if (!allOffers.length) return null;

    return {
      country,
      lastSyncedAt: null,
      offersByType: grouped,
      allOffers,
      credits: {
        text: "Data powered by TMDB",
        logoUrl: "https://image.tmdb.org/t/p/original//43uA9t8ufehhlGq4iVFaLjSlIc3.png",
        url: "https://www.themoviedb.org",
      },
    };
  } catch {
    return null;
  }
}

/** Same resolution order as title pages: JustWatch first, TMDB watch/providers fallback. */
export async function resolveWatchAvailability(
  type: "movie" | "tv",
  tmdbId: number,
  country = "US"
): Promise<JustWatchAvailabilityResponse | null> {
  const countryUpper = country.toUpperCase().slice(0, 2);
  let availability = await getJustWatchAvailability(type, tmdbId, countryUpper);
  if (!hasOffers(availability)) {
    const fallback = await tmdbWatchAvailability(type, tmdbId, countryUpper);
    if (fallback) availability = fallback;
  }
  return availability;
}

export function pickPrimaryWatchProvider(
  availability: JustWatchAvailabilityResponse | null | undefined
): JustWatchOffer | null {
  if (!availability) return null;
  return (
    availability.offersByType?.flatrate?.[0] ??
    availability.offersByType?.buy?.[0] ??
    availability.offersByType?.rent?.[0] ??
    availability.allOffers?.[0] ??
    null
  );
}

export function toPickForTonightProvider(offer: JustWatchOffer | null): PickForTonightProvider | null {
  if (!offer) return null;
  return {
    providerName: offer.providerName,
    iconUrl: offer.iconUrl ?? null,
    monetizationType: offer.monetizationType,
    standardWebUrl: offer.standardWebUrl ?? null,
    deepLinkUrl: offer.deepLinkUrl ?? null,
  };
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) break;
      results[index] = await fn(items[index], index);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
