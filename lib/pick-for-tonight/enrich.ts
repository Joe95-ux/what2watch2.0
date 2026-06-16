import { getMovieDetails, getTVDetails } from "@/lib/tmdb";
import { getOMDBFullData } from "@/lib/omdb";
import { resolveDisplayRating } from "@/lib/rating-quality";
import type { PickForTonightCandidate } from "@/lib/pick-for-tonight-types";
import type { LightCandidate } from "@/lib/pick-for-tonight/internal-types";
import {
  mapWithConcurrency,
  pickPrimaryWatchProvider,
  resolveWatchAvailability,
  toPickForTonightProvider,
} from "@/lib/resolve-watch-availability";

const ENRICH_CONCURRENCY = 4;
const DEFAULT_WATCH_COUNTRY = "US";

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

function emptyCandidate(c: LightCandidate): PickForTonightCandidate {
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

export async function enrichLightCandidate(c: LightCandidate): Promise<PickForTonightCandidate> {
  const base = emptyCandidate(c);

  let details: Awaited<ReturnType<typeof getMovieDetails>> | null = null;
  try {
    details = c.mediaType === "movie" ? await getMovieDetails(c.tmdbId) : await getTVDetails(c.tmdbId);
  } catch (error) {
    console.warn("[pick-for-tonight] TMDB details failed", c.id, error);
  }

  const imdbId = details?.external_ids?.imdb_id ?? null;
  let omdb: Awaited<ReturnType<typeof getOMDBFullData>> | null = null;
  if (imdbId) {
    try {
      omdb = await getOMDBFullData(imdbId);
    } catch {
      // optional enrichment
    }
  }

  const availability = await resolveWatchAvailability(c.mediaType, c.tmdbId, DEFAULT_WATCH_COUNTRY);
  const primaryProvider = pickPrimaryWatchProvider(availability);

  if (!details) {
    return {
      ...base,
      provider: toPickForTonightProvider(primaryProvider),
      justwatchRank24h: availability?.ranks?.["1d"]?.rank ?? null,
      justwatchRankDelta24h: availability?.ranks?.["1d"]?.delta ?? null,
      justwatchRankUrl: availability?.fullPath ? `https://www.justwatch.com${availability.fullPath}` : null,
    };
  }

  const runtimeMinutes =
    c.mediaType === "movie"
      ? (details as { runtime?: number }).runtime ?? null
      : (details as { episode_run_time?: number[] }).episode_run_time?.[0] ?? null;

  const voteCount = (details as { vote_count?: number }).vote_count ?? null;
  const tmdbRating = details.vote_average > 0 ? details.vote_average : null;
  const resolvedRating = resolveDisplayRating({
    imdbRating: omdb?.imdbRating ?? null,
    imdbVotes: omdb?.imdbVotes ?? null,
    tmdbRating,
    tmdbVoteCount: voteCount,
  });

  const genres = (details as { genres?: { id?: number; name?: string }[] }).genres ?? [];
  const genreIds = genres
    .map((g) => g.id)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  const genreNames = genres
    .map((g) => g.name?.trim())
    .filter((x): x is string => Boolean(x));

  return {
    ...base,
    genreNames,
    genreIds,
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
    imdbRating: resolvedRating?.rating ?? null,
    justwatchRank24h: availability?.ranks?.["1d"]?.rank ?? null,
    justwatchRankDelta24h: availability?.ranks?.["1d"]?.delta ?? null,
    justwatchRankUrl: availability?.fullPath ? `https://www.justwatch.com${availability.fullPath}` : null,
    provider: toPickForTonightProvider(primaryProvider),
  };
}

export async function enrichBatch(candidates: LightCandidate[]): Promise<PickForTonightCandidate[]> {
  return mapWithConcurrency(candidates, ENRICH_CONCURRENCY, (c) => enrichLightCandidate(c));
}
