import { getMovieDetails, getTVDetails } from "@/lib/tmdb";
import { getOMDBFullData } from "@/lib/omdb";
import { getJustWatchAvailability } from "@/lib/justwatch";
import type { PickForTonightCandidate } from "@/lib/pick-for-tonight-types";
import type { LightCandidate } from "@/lib/pick-for-tonight/internal-types";

function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function yearFromDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return String(d.getFullYear());
}

export async function enrichLightCandidate(c: LightCandidate): Promise<PickForTonightCandidate> {
  try {
    const details = c.mediaType === "movie" ? await getMovieDetails(c.tmdbId) : await getTVDetails(c.tmdbId);
    const imdbId = details.external_ids?.imdb_id ?? null;
    const [omdb, availability] = await Promise.all([
      imdbId ? getOMDBFullData(imdbId) : Promise.resolve(null),
      getJustWatchAvailability(c.mediaType, c.tmdbId, "US"),
    ]);
    const runtimeMinutes =
      c.mediaType === "movie"
        ? (details as { runtime?: number }).runtime ?? null
        : (details as { episode_run_time?: number[] }).episode_run_time?.[0] ?? null;
    const primaryProvider =
      availability?.offersByType?.flatrate?.[0] ??
      availability?.offersByType?.buy?.[0] ??
      availability?.offersByType?.rent?.[0] ??
      availability?.allOffers?.[0] ??
      null;

    const genres = (details as { genres?: { id?: number; name?: string }[] }).genres ?? [];
    const genreIds = genres
      .map((g) => g.id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
    const genreNames = genres
      .map((g) => g.name?.trim())
      .filter((x): x is string => Boolean(x));

    return {
      id: c.id,
      tmdbId: c.tmdbId,
      mediaType: c.mediaType,
      title: c.title,
      posterPath: c.posterPath,
      hints: c.hints,
      genreNames,
      genreIds,
      whyTonight: "",
      matchPercent: 0,
      backdropPath: details.backdrop_path ?? null,
      releaseDate: c.mediaType === "movie" ? (details as { release_date?: string }).release_date ?? null : null,
      firstAirDate: c.mediaType === "tv" ? (details as { first_air_date?: string }).first_air_date ?? null : null,
      releaseYear:
        c.mediaType === "movie"
          ? yearFromDate((details as { release_date?: string }).release_date ?? null)
          : yearFromDate((details as { first_air_date?: string }).first_air_date ?? null),
      rated: omdb?.rated ?? null,
      runtimeText: formatRuntime(runtimeMinutes),
      overview: details.overview ?? null,
      imdbRating: omdb?.imdbRating ?? (details.vote_average > 0 ? Number(details.vote_average.toFixed(1)) : null),
      justwatchRank24h: availability?.ranks?.["1d"]?.rank ?? null,
      justwatchRankDelta24h: availability?.ranks?.["1d"]?.delta ?? null,
      justwatchRankUrl: availability?.fullPath ? `https://www.justwatch.com${availability.fullPath}` : null,
      isTrendingTodayPick: c.hints.includes("Trending today"),
      provider: primaryProvider
        ? {
            providerName: primaryProvider.providerName,
            iconUrl: primaryProvider.iconUrl ?? null,
            monetizationType: primaryProvider.monetizationType,
            standardWebUrl: primaryProvider.standardWebUrl ?? null,
            deepLinkUrl: primaryProvider.deepLinkUrl ?? null,
          }
        : null,
    };
  } catch {
    return {
      id: c.id,
      tmdbId: c.tmdbId,
      mediaType: c.mediaType,
      title: c.title,
      posterPath: c.posterPath,
      hints: c.hints,
      genreNames: [],
      genreIds: [],
      whyTonight: "",
      matchPercent: 0,
      backdropPath: null,
      releaseDate: null,
      firstAirDate: null,
      releaseYear: null,
      rated: null,
      runtimeText: null,
      overview: null,
      imdbRating: null,
      justwatchRank24h: null,
      justwatchRankDelta24h: null,
      justwatchRankUrl: null,
      isTrendingTodayPick: c.hints.includes("Trending today"),
      provider: null,
    };
  }
}

export async function enrichBatch(candidates: LightCandidate[]): Promise<PickForTonightCandidate[]> {
  return Promise.all(candidates.map((c) => enrichLightCandidate(c)));
}
