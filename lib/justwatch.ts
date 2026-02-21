import "server-only";

const CONTENT_PARTNER_BASE =
  process.env.JUSTWATCH_API_BASE_URL ?? "https://apis.justwatch.com/contentpartner/v2/content";
/** Partner token (query param). Prefer JUSTWATCH_TOKEN; fallback JUSTWATCH_API_KEY for legacy. */
const getToken = () => process.env.JUSTWATCH_TOKEN ?? process.env.JUSTWATCH_API_KEY;

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

/** Streaming chart rank for a time window (1d, 7d, 30d). */
export interface JustWatchRankWindow {
  rank: number;
  delta: number;
}

/** Upcoming release when a title has no offers yet. See JustWatch Upcoming Release Dates. */
export interface JustWatchUpcomingRelease {
  country: string;
  providerId: number;
  providerName: string;
  iconUrl: string | null;
  releaseWindowFrom: string;
  releaseWindowTo: string;
  releaseType: "digital" | "re_release" | "theatrical" | string;
  /** Human-readable label: exact date, month, season, year, or TBA. */
  label: string;
}

/** Content leaving a platform soon. */
export interface JustWatchLeavingSoon {
  providerId: number;
  providerName: string;
  iconUrl: string | null;
  expiresAt: string; // ISO date
  /** Human-readable label: "Leaving in X days" or "Leaving on [date]" */
  label: string;
}

/** Why to Watch recommendation from JustWatch. */
export interface JustWatchRecommendation {
  id: string;
  text: string;
  author?: string;
  authorRole?: string; // e.g., "Editor", "Celebrity"
  source?: string;
}

export interface JustWatchAvailabilityResponse {
  country: string;
  lastSyncedAt?: string | null;
  offersByType: Record<JustWatchMonetization, JustWatchOffer[]>;
  allOffers: JustWatchOffer[];
  /** Upcoming release dates when there are no offers. */
  upcoming?: JustWatchUpcomingRelease[];
  /** Content leaving platforms soon. */
  leavingSoon?: JustWatchLeavingSoon[];
  /** Streaming chart ranks when available. Link to JustWatch with rank as anchor per attribution. */
  ranks?: {
    "1d"?: JustWatchRankWindow;
    "7d"?: JustWatchRankWindow;
    "30d"?: JustWatchRankWindow;
  } | null;
  /** JustWatch full_path for this title (e.g. /us/movie/notting-hill) for attribution link. */
  fullPath?: string | null;
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

/** Raw upcoming item from JustWatch API (when offers is null/empty). */
interface JustWatchUpcomingApiItem {
  country: string;
  provider_id: number;
  release_window_from: string;
  release_window_to: string;
  release_type: string;
}

/** Content Partner API: offers response (Movie/Show Offers by ID). Includes upcoming when no offers. */
interface JustWatchOffersApiResponse {
  offers?: Array<{
    monetization_type: JustWatchMonetization;
    provider_id: number;
    presentation_type?: string;
    retail_price?: number;
    currency?: string;
    urls?: { standard_web?: string; deeplink?: string };
    // Additional fields that may be available but not currently used:
    package_short_name?: string; // e.g., "netflix_basic", "netflix_premium"
    package_id?: number;
    expires_at?: string; // ISO date when content leaves platform
    valid_until?: string; // Alternative field for expiration
    element_count?: number; // Number of episodes/seasons
    hd_price?: number; // Separate HD pricing
    sd_price?: number; // Separate SD pricing
    uhd_price?: number; // Separate 4K pricing
    quality?: string; // Quality/resolution info
    audio_qualities?: string[]; // Audio format (e.g., "dolby_atmos")
    subtitle_languages?: string[]; // Available subtitle languages
    audio_languages?: string[]; // Available audio tracks
    retail_price_type?: string; // Price type (SD/HD/4K)
    [key: string]: any; // Allow for other fields we haven't discovered yet
  }>;
  full_path?: string;
  ranks?: {
    "1d"?: { rank: number; delta: number };
    "7d"?: { rank: number; delta: number };
    "30d"?: { rank: number; delta: number };
  };
  upcoming?: JustWatchUpcomingApiItem[];
  // Additional top-level fields that may be available:
  leaving?: Array<{
    provider_id: number;
    expires_at: string;
    country: string;
  }>; // Content leaving platforms soon
  [key: string]: any; // Allow for other top-level fields
}

function buildImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const sanitized = path.replace("{profile}", "s100");
  return `https://images.justwatch.com${sanitized}`;
}

/** Format release window per JustWatch docs: Exact Date (+ weeks left), Year, Season, Month, or TBA. */
function formatUpcomingReleaseLabel(from: string, to: string): string {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return "TBA";

  const fromDay = fromDate.getUTCDate();
  const fromMonth = fromDate.getUTCMonth();
  const fromYear = fromDate.getUTCFullYear();
  const toDay = toDate.getUTCDate();
  const toMonth = toDate.getUTCMonth();
  const toYear = toDate.getUTCFullYear();

  const isSameDay = fromYear === toYear && fromMonth === toMonth && fromDay === toDay;
  if (isSameDay) {
    const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
    const formatted = fromDate.toLocaleDateString(undefined, options);
    const now = new Date();
    const weeksLeft = Math.max(0, Math.ceil((fromDate.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    return weeksLeft > 0 ? `${formatted} (${weeksLeft} week${weeksLeft === 1 ? "" : "s"} left)` : formatted;
  }

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthLabel = months[fromMonth];

  if (fromDay === 1 && toDay >= 28 && fromMonth === toMonth && fromYear === toYear) {
    return monthLabel;
  }
  if (fromDay === 1 && fromMonth === 0 && toDay === 31 && toMonth === 11 && fromYear === toYear) {
    return String(fromYear);
  }
  if (fromDay === 1 && fromMonth === 8 && toDay === 30 && toMonth === 10) return "Autumn";
  if (fromDay === 1 && fromMonth === 11 && toDay === 28 && toMonth === 1) return "Winter";
  if (fromDay === 1 && fromMonth === 2 && toDay === 31 && toMonth === 4) return "Spring";
  if (fromDay === 1 && fromMonth === 5 && toDay === 30 && toMonth === 7) return "Summer";
  if (fromDay === 1 && toDay >= 28 && fromMonth === toMonth && fromYear === toYear) return monthLabel;
  if (fromDay === 1 && fromMonth === 0 && (toDay === 31 || toDay === 30 || toDay === 28) && toMonth === 11 && fromYear === toYear) return String(fromYear);

  return "TBA";
}

/** Map country code to JustWatch locale (e.g. US -> en_US). */
function countryToLocale(country: string): string {
  const upper = country.toUpperCase().slice(0, 2);
  const map: Record<string, string> = {
    US: "en_US",
    GB: "en_GB",
    CA: "en_CA",
    AU: "en_AU",
    DE: "de_DE",
    FR: "fr_FR",
    ES: "es_ES",
    IT: "it_IT",
    BR: "pt_BR",
    MX: "es_MX",
    IN: "en_IN",
    JP: "ja_JP",
    KR: "ko_KR",
  };
  return map[upper] ?? "en_US";
}

async function fetchFromJustWatch(path: string, searchParams?: Record<string, string>) {
  const token = getToken();
  if (!token) {
    throw new Error("JUSTWATCH_TOKEN (or JUSTWATCH_API_KEY) is not configured");
  }

  const url = new URL(CONTENT_PARTNER_BASE + path);
  url.searchParams.set("token", token);
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" },
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

/** Country option for dropdown (from JustWatch Active Countries). */
export interface JustWatchCountry {
  code: string;
  name: string;
}

/**
 * Fetch active countries supported by the JustWatch API.
 * @see https://apis.justwatch.com/docs/api/
 */
export async function getJustWatchCountries(): Promise<JustWatchCountry[]> {
  try {
    const token = getToken();
    if (!token) return [];
    const data = (await fetchFromJustWatch("/countries")) as Array<{
      url_part: string;
      country: string;
      status?: string;
    }>;
    if (!Array.isArray(data)) return [];
    return data
      .filter((c) => c.status !== "inactive")
      .map((c) => ({ code: (c.url_part ?? "").toUpperCase().slice(0, 2), name: c.country ?? c.url_part ?? "" }))
      .filter((c) => c.code && c.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("[JustWatch] Failed to load countries", error);
    return [];
  }
}

/**
 * Fetch Where to Watch + Streaming Chart ranks using the JustWatch Content Partner API.
 * @see https://apis.justwatch.com/docs/api/
 */
export async function getJustWatchAvailability(
  type: "movie" | "tv",
  tmdbId: number,
  country: string = "US"
): Promise<JustWatchAvailabilityResponse | null> {
  try {
    const locale = countryToLocale(country);
    const objectType = type === "movie" ? "movie" : "show";

    const token = getToken();
    if (!token) return null;

    const offersPath = `/offers/object_type/${objectType}/id_type/tmdb/locale/${locale}`;
    const [rawOffersData, providersData] = await Promise.all([
      fetchFromJustWatch(offersPath, { id: String(tmdbId) }),
      fetchFromJustWatch(`/providers/all/locale/${locale}`),
    ]);

    const offersData = rawOffersData as JustWatchOffersApiResponse;
    const offers = offersData?.offers ?? [];

    // DEBUG: Log raw response structure in development to identify unused fields
    if (process.env.NODE_ENV === "development" && offers.length > 0) {
      console.log("[JustWatch DEBUG] Sample offer structure:", JSON.stringify(offers[0], null, 2));
      console.log("[JustWatch DEBUG] Full response keys:", Object.keys(offersData));
      if (offersData && typeof offersData === "object") {
        const allKeys = new Set<string>();
        offers.forEach((offer: any) => {
          if (offer && typeof offer === "object") {
            Object.keys(offer).forEach(k => allKeys.add(k));
          }
        });
        console.log("[JustWatch DEBUG] All offer field keys found:", Array.from(allKeys).sort());
      }
    }

    // Extract leaving soon offers (offers with expires_at or valid_until)
    const leavingSoon: JustWatchLeavingSoon[] = [];
    const now = new Date();
    offers.forEach((offer: any) => {
      const expiresAt = offer.expires_at || offer.valid_until;
      if (expiresAt) {
        const expireDate = new Date(expiresAt);
        if (!Number.isNaN(expireDate.getTime()) && expireDate > now) {
          const provider = providerMap.get(offer.provider_id);
          const daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const label = daysLeft === 1 
            ? "Leaving tomorrow"
            : daysLeft <= 7
            ? `Leaving in ${daysLeft} days`
            : expireDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
          
          leavingSoon.push({
            providerId: offer.provider_id,
            providerName: provider?.clear_name ?? `Provider ${offer.provider_id}`,
            iconUrl: buildImageUrl(provider?.icon_url),
            expiresAt: expiresAt,
            label: label,
          });
        }
      }
    });
    // Sort by expiration date (soonest first)
    leavingSoon.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());

    const providerMap = new Map<number, JustWatchProviderResponse>();
    (providersData as JustWatchProviderResponse[]).forEach((p) => providerMap.set(p.id, p));

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
      const key = normalizedOffer.monetizationType;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(normalizedOffer);
    }

    (Object.keys(grouped) as JustWatchMonetization[]).forEach((key) => {
      grouped[key] = grouped[key] || [];
    });

    const ranks = offersData?.ranks
      ? {
          "1d": offersData.ranks["1d"],
          "7d": offersData.ranks["7d"],
          "30d": offersData.ranks["30d"],
        }
      : null;

    const countryUpper = country.toUpperCase();
    const upcoming: JustWatchUpcomingRelease[] = (offersData?.upcoming ?? [])
      .filter((u) => u.country === countryUpper)
      .map((u) => {
        const provider = providerMap.get(u.provider_id);
        return {
          country: u.country,
          providerId: u.provider_id,
          providerName: provider?.clear_name ?? `Provider ${u.provider_id}`,
          iconUrl: buildImageUrl(provider?.icon_url ?? null),
          releaseWindowFrom: u.release_window_from,
          releaseWindowTo: u.release_window_to,
          releaseType: u.release_type,
          label: formatUpcomingReleaseLabel(u.release_window_from, u.release_window_to),
        };
      });

    return {
      country: countryUpper,
      lastSyncedAt: null,
      offersByType: grouped,
      allOffers: normalized,
      upcoming: upcoming.length > 0 ? upcoming : undefined,
      leavingSoon: leavingSoon.length > 0 ? leavingSoon : undefined,
      ranks: ranks ?? undefined,
      fullPath: offersData?.full_path ?? null,
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
    }
    return null;
  }
}

/**
 * Fetch Where to Watch for a specific TV season.
 * Uses the season dropdown value (season number); see JustWatch API:
 * https://apis.justwatch.com/docs/api/
 * Route: GET /offers/object_type/show/id_type/tmdb/season_number/{season_number}/locale/{locale}?id={showId}
 */
export async function getJustWatchSeasonAvailability(
  showTmdbId: number,
  seasonNumber: number,
  country: string = "US"
): Promise<JustWatchAvailabilityResponse | null> {
  try {
    const locale = countryToLocale(country);
    const token = getToken();
    if (!token) return null;

    const path = `/offers/object_type/show/id_type/tmdb/season_number/${seasonNumber}/locale/${locale}`;
    const [rawData, providersData] = await Promise.all([
      fetchFromJustWatch(path, { id: String(showTmdbId) }),
      fetchFromJustWatch(`/providers/all/locale/${locale}`),
    ]);

    const seasonData = rawData as JustWatchOffersApiResponse;
    const offers = seasonData?.offers ?? [];
    const providerMap = new Map<number, JustWatchProviderResponse>();
    (providersData as JustWatchProviderResponse[]).forEach((p) => providerMap.set(p.id, p));

    const grouped = emptyGroupedOffers();
    const normalized: JustWatchOffer[] = [];

    for (const offer of offers) {
      const provider = providerMap.get(offer.provider_id);
      const no: JustWatchOffer = {
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
      normalized.push(no);
      const k = no.monetizationType;
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(no);
    }

    (Object.keys(grouped) as JustWatchMonetization[]).forEach((k) => {
      grouped[k] = grouped[k] || [];
    });

    const countryUpper = country.toUpperCase();
    const seasonUpcoming: JustWatchUpcomingRelease[] = (seasonData?.upcoming ?? [])
      .filter((u) => u.country === countryUpper)
      .map((u) => {
        const provider = providerMap.get(u.provider_id);
        return {
          country: u.country,
          providerId: u.provider_id,
          providerName: provider?.clear_name ?? `Provider ${u.provider_id}`,
          iconUrl: buildImageUrl(provider?.icon_url ?? null),
          releaseWindowFrom: u.release_window_from,
          releaseWindowTo: u.release_window_to,
          releaseType: u.release_type,
          label: formatUpcomingReleaseLabel(u.release_window_from, u.release_window_to),
        };
      });

    // Extract leaving soon for season offers
    const seasonLeavingSoon: JustWatchLeavingSoon[] = [];
    const now = new Date();
    offers.forEach((offer: any) => {
      const expiresAt = offer.expires_at || offer.valid_until;
      if (expiresAt) {
        const expireDate = new Date(expiresAt);
        if (!Number.isNaN(expireDate.getTime()) && expireDate > now) {
          const provider = providerMap.get(offer.provider_id);
          const daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const label = daysLeft === 1 
            ? "Leaving tomorrow"
            : daysLeft <= 7
            ? `Leaving in ${daysLeft} days`
            : expireDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
          
          seasonLeavingSoon.push({
            providerId: offer.provider_id,
            providerName: provider?.clear_name ?? `Provider ${offer.provider_id}`,
            iconUrl: buildImageUrl(provider?.icon_url),
            expiresAt: expiresAt,
            label: label,
          });
        }
      }
    });
    seasonLeavingSoon.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());

    return {
      country: countryUpper,
      lastSyncedAt: null,
      offersByType: grouped,
      allOffers: normalized,
      upcoming: seasonUpcoming.length > 0 ? seasonUpcoming : undefined,
      leavingSoon: seasonLeavingSoon.length > 0 ? seasonLeavingSoon : undefined,
      fullPath: seasonData?.full_path ?? null,
      credits: {
        text: "Data powered by JustWatch",
        logoUrl: "https://widget.justwatch.com/assets/JW_logo_color_10px.svg",
        url: "https://www.justwatch.com",
      },
    };
  } catch (error) {
    console.error("[JustWatch] Failed to load season availability", error);
    return null;
  }
}

/**
 * Fetch "Why to Watch" recommendations from JustWatch.
 * @see https://apis.justwatch.com/docs/api/
 * Route: GET /recommendations/object_type/{object_type}/id_type/tmdb/locale/{locale}?id={tmdbId}
 */
export async function getJustWatchRecommendations(
  type: "movie" | "tv",
  tmdbId: number,
  country: string = "US"
): Promise<JustWatchRecommendation[]> {
  try {
    const locale = countryToLocale(country);
    const objectType = type === "movie" ? "movie" : "show";
    const token = getToken();
    if (!token) return [];

    const path = `/recommendations/object_type/${objectType}/id_type/tmdb/locale/${locale}`;
    const data = await fetchFromJustWatch(path, { id: String(tmdbId) }) as Array<{
      id?: string;
      text: string;
      author?: string;
      author_role?: string;
      source?: string;
    }>;

    if (!Array.isArray(data)) return [];

    return data.slice(0, 40).map((rec) => ({
      id: rec.id || `${tmdbId}-${rec.text.slice(0, 20)}`,
      text: rec.text,
      author: rec.author,
      authorRole: rec.author_role,
      source: rec.source,
    }));
  } catch (error) {
    console.error("[JustWatch] Failed to load recommendations", error);
    return [];
  }
}
