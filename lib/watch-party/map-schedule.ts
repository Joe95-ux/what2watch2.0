export type WatchPartyScheduleRecurrence = "NONE" | "WEEKLY";

export function mapWatchPartySchedule(row: {
  id: string;
  hostUserId: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  scheduledAt: Date;
  recurrence: string;
  note: string | null;
  createdAt: Date;
  host?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}) {
  const recurrence: WatchPartyScheduleRecurrence =
    row.recurrence === "WEEKLY" ? "WEEKLY" : "NONE";
  return {
    id: row.id,
    hostUserId: row.hostUserId,
    tmdbId: row.tmdbId,
    mediaType: row.mediaType as "movie" | "tv",
    title: row.title,
    posterPath: row.posterPath,
    seasonNumber: row.seasonNumber,
    episodeNumber: row.episodeNumber,
    scheduledAt: row.scheduledAt.toISOString(),
    recurrence,
    note: row.note?.trim() || null,
    createdAt: row.createdAt.toISOString(),
    host: row.host
      ? {
          id: row.host.id,
          name: row.host.displayName || row.host.username || "Host",
          avatarUrl: row.host.avatarUrl,
        }
      : null,
  };
}

export type WatchPartyScheduleDto = ReturnType<typeof mapWatchPartySchedule>;
