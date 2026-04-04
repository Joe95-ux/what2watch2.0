import type { UnifiedViewingLog, ViewingLog } from "@/hooks/use-viewing-logs";

/**
 * Groups diary rows for rewatch detection. TV episodes/season batches that differ
 * get different signatures; movies are keyed by tmdb id only.
 */
export function diaryLogWatchSignature(
  log: Pick<ViewingLog, "mediaType" | "tmdbId" | "title">
): string {
  if (log.mediaType === "movie") {
    return `movie:${log.tmdbId}`;
  }
  const t = log.title;
  const ep = t.match(/S(\d+)\s*E(\d+)/i);
  if (ep) {
    return `tv:${log.tmdbId}:ep:${parseInt(ep[1], 10)}:${parseInt(ep[2], 10)}`;
  }
  const seasonMatches = [...t.matchAll(/\bS(\d+)\b/gi)];
  if (seasonMatches.length > 0) {
    const seasons = seasonMatches.map((m) => parseInt(m[1], 10)).sort((a, b) => a - b);
    return `tv:${log.tmdbId}:seasons:${seasons.join(",")}`;
  }
  return `tv:${log.tmdbId}:show`;
}

/** Seasons-only pattern in title (e.g. "Show S1" / "S1, S2"); null if an SxEy episode is present. */
export function parseTvSeasonsOnlyFromTitle(title: string): number[] | null {
  if (/S\d+\s*E\d+/i.test(title)) return null;
  const seasonMatches = [...title.matchAll(/\bS(\d+)\b/gi)];
  if (seasonMatches.length === 0) return null;
  return seasonMatches.map((m) => parseInt(m[1], 10)).sort((a, b) => a - b);
}

export function unifiedViewingLogMatchesTvEpisode(
  ul: UnifiedViewingLog,
  season: number,
  episode: number
): boolean {
  if (ul.type === "viewingLog" && ul.title) {
    const m = ul.title.match(/S(\d+)\s*E(\d+)/i);
    if (!m) return false;
    return parseInt(m[1], 10) === season && parseInt(m[2], 10) === episode;
  }
  if (ul.type === "episodeLog" && ul.seasonNumber === season) {
    if (ul.episodeNumber !== undefined) return ul.episodeNumber === episode;
    if (ul.episodeNumbers?.length) return ul.episodeNumbers.includes(episode);
    return false;
  }
  return false;
}

export function unifiedViewingLogMatchesTvSeasons(
  ul: UnifiedViewingLog,
  seasonsSorted: number[]
): boolean {
  if (ul.type !== "viewingLog" || !ul.title) return false;
  const parsed = parseTvSeasonsOnlyFromTitle(ul.title);
  if (!parsed || parsed.length !== seasonsSorted.length) return false;
  return parsed.every((v, i) => v === seasonsSorted[i]);
}

function isUnifiedShowLevelViewingLog(ul: UnifiedViewingLog): boolean {
  return ul.type === "viewingLog" && !!ul.title && !/\bS\d+/i.test(ul.title);
}

/**
 * Detail page: rewatch = same movie logged 2+ times, or same TV episode/season batch/show-level row 2+ times
 * in the unified by-content timeline (not "any other episode of the show").
 */
export function isDiaryLogRewatchForDetailPage(
  log: Pick<ViewingLog, "mediaType" | "tmdbId" | "title">,
  unifiedLogs: UnifiedViewingLog[]
): boolean {
  if (log.mediaType === "movie") {
    const movieLogs = unifiedLogs.filter((u) => u.type === "viewingLog");
    return movieLogs.length > 1;
  }
  const t = log.title;
  const ep = t.match(/S(\d+)\s*E(\d+)/i);
  if (ep) {
    const s = parseInt(ep[1], 10);
    const e = parseInt(ep[2], 10);
    return unifiedLogs.filter((u) => unifiedViewingLogMatchesTvEpisode(u, s, e)).length > 1;
  }
  const seasonsOnly = parseTvSeasonsOnlyFromTitle(t);
  if (seasonsOnly && seasonsOnly.length > 0) {
    return unifiedLogs.filter((u) => unifiedViewingLogMatchesTvSeasons(u, seasonsOnly)).length > 1;
  }
  return unifiedLogs.filter(isUnifiedShowLevelViewingLog).length > 1;
}

export function diaryRewatchAriaLabel(
  log: Pick<ViewingLog, "mediaType" | "title">
): string {
  if (log.mediaType === "movie") return "Movie has been rewatched";
  if (/S\d+\s*E\d+/i.test(log.title)) return "This episode has been logged more than once";
  if (parseTvSeasonsOnlyFromTitle(log.title)) return "This season entry has been logged more than once";
  return "This show has been logged more than once";
}
