import "server-only";

const JUSTWATCH_API_BASE_URL =
  process.env.JUSTWATCH_API_BASE_URL ?? "https://apis.justwatch.com";
const JUSTWATCH_API_KEY = process.env.JUSTWATCH_API_KEY;

export type JustWatchMonetization =
  | "flatrate"
  | "rent"
  | "buy"
  | "ads"
  | "free"
  | "cinema"
  | "other";

export interface JustWatchOffer {
  providerId: number;
  providerName: string;
  iconUrl: string | null;
  monetizationType: JustWatchMonetization;
  retailPrice?: number | null;
  currency?: string | null;
  presentationType?: string | null;
  standardWebUrl?: string | null;
  deepLinkUrl?: string | null;
}

export interface JustWatchAvailabilityResponse {
  country: string;
  lastSyncedAt?: string | null;
  offersByType: Record<JustWatchMonetization, JustWatchOffer[]>;
  allOffers: JustWatchOffer[];
  credits: {
    text: string;
    logoUrl: string;
    url: string;
  };
}

interface JustWatchProviderResponse {
  id: number;
  clear_name: string;
  icon_url: string | null;
}

interface JustWatchTitleResponse {
  offers?: Array<{
    provider_id: number;
    monetization_type: JustWatchMonetization;
    retail_price?: number;
    currency?: string;
    presentation_type?: string;
    urls?: {
      standard_web?: string;
      deeplink?: string;
    };
  }>;
  last_full_sync_at?: string;
}

function buildImageUrl(path?: string | null) {
  if (!path) return null;
  const sanitized = path.replace("{profile}", "s100");
  return `https://images.justwatch.com${sanitized}`;
}

async function fetchFromJustWatch(path: string, init: RequestInit = {}) {
  if (!JUSTWATCH_API_KEY) {
    throw new Error("JUSTWATCH_API_KEY is not configured");
  }

  const url = `${JUSTWATCH_API_BASE_URL}${path}`;
  console.log(`[JustWatch] Fetching: ${url}`);
  
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": JUSTWATCH_API_KEY,
      ...(init.headers || {}),
    },
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error(`[JustWatch] Request failed: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`JustWatch request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function emptyGroupedOffers(): Record<JustWatchMonetization, JustWatchOffer[]> {
  return {
    flatrate: [],
    rent: [],
    buy: [],
    ads: [],
    free: [],
    cinema: [],
    other: [],
  };
}

export async function getJustWatchAvailability(
  type: "movie" | "tv",
  tmdbId: number,
  country: string = "US"
): Promise<JustWatchAvailabilityResponse | null> {
  try {
    const locale = country.toLowerCase();
    const titlePath = `tmdb-${type === "movie" ? "movie" : "show"}-${tmdbId}`;

    console.log(`[JustWatch] Fetching availability for ${type} ${tmdbId} in ${locale}`);

    const [rawTitleData, providersData] = await Promise.all([
      fetchFromJustWatch(`/content/titles/${locale}/${titlePath}`),
      fetchFromJustWatch(`/content/providers/locale/${locale}`),
    ]);

    const titleData = rawTitleData as JustWatchTitleResponse;
    const offers = titleData?.offers ?? [];
    if (!offers.length) {
      return {
        country: country.toUpperCase(),
        lastSyncedAt: titleData?.last_full_sync_at ?? null,
        offersByType: emptyGroupedOffers(),
        allOffers: [],
        credits: {
          text: "Data powered by JustWatch",
          logoUrl: "https://widget.justwatch.com/assets/JW_logo_color_10px.svg",
          url: "https://www.justwatch.com",
        },
      };
    }

    const providerMap = new Map<number, JustWatchProviderResponse>();
    (providersData as JustWatchProviderResponse[]).forEach((provider) => {
      providerMap.set(provider.id, provider);
    });

    const grouped = emptyGroupedOffers();
    const normalized: JustWatchOffer[] = [];

    for (const offer of offers) {
      const provider = providerMap.get(offer.provider_id);
      const normalizedOffer: JustWatchOffer = {
        providerId: offer.provider_id,
        providerName: provider?.clear_name ?? `Provider ${offer.provider_id}`,
        iconUrl: buildImageUrl(provider?.icon_url),
        monetizationType: offer.monetization_type ?? "other",
        retailPrice: offer.retail_price ?? null,
        currency: offer.currency ?? null,
        presentationType: offer.presentation_type ?? null,
        standardWebUrl: offer.urls?.standard_web ?? null,
        deepLinkUrl: offer.urls?.deeplink ?? null,
      };
      normalized.push(normalizedOffer);
      if (!grouped[normalizedOffer.monetizationType]) {
        grouped[normalizedOffer.monetizationType] = [];
      }
      grouped[normalizedOffer.monetizationType].push(normalizedOffer);
    }

    // Ensure arrays exist even if empty
    (Object.keys(grouped) as JustWatchMonetization[]).forEach((key) => {
      grouped[key] = grouped[key] || [];
    });

    return {
      country: country.toUpperCase(),
      lastSyncedAt: titleData?.last_full_sync_at ?? null,
      offersByType: grouped,
      allOffers: normalized,
      credits: {
        text: "Data powered by JustWatch",
        logoUrl: "https://widget.justwatch.com/assets/JW_logo_color_10px.svg",
        url: "https://www.justwatch.com",
      },
    };
  } catch (error) {
    console.error("[JustWatch] Failed to load availability", error);
    if (error instanceof Error) {
      console.error("[JustWatch] Error message:", error.message);
      console.error("[JustWatch] Error stack:", error.stack);
    }
    return null;
  }
}

