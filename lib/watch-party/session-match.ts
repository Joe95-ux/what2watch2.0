export type WatchPartySessionTarget = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  seasonNumber?: number | null;
  episodeNumber?: number | null;
};

export type WatchingSessionLike = {
  tmdbId: number;
  mediaType: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
};

export function watchPartyMatchesSession(
  party: WatchPartySessionTarget,
  session: WatchingSessionLike
): boolean {
  if (party.tmdbId !== session.tmdbId) return false;
  if (party.mediaType !== session.mediaType) return false;
  if (party.mediaType !== "tv") return true;
  return (
    (party.seasonNumber ?? null) === (session.seasonNumber ?? null) &&
    (party.episodeNumber ?? null) === (session.episodeNumber ?? null)
  );
}

export function watchPartyStartPayload(party: WatchPartySessionTarget & {
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
}) {
  return {
    tmdbId: party.tmdbId,
    mediaType: party.mediaType,
    title: party.title,
    posterPath: party.posterPath ?? null,
    backdropPath: party.backdropPath ?? null,
    seasonNumber: party.mediaType === "tv" ? party.seasonNumber ?? null : null,
    episodeNumber: party.mediaType === "tv" ? party.episodeNumber ?? null : null,
  };
}
