import { db } from "@/lib/db";
import { getTVSeasonDetails } from "@/lib/tmdb";

export type WatchedUpsertSession = {
  userId: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
};

export async function syncEpisodeViewingFromSession(session: WatchedUpsertSession, watchedAt: Date): Promise<void> {
  if (session.mediaType !== "tv") return;
  if (!Number.isInteger(session.seasonNumber) || !Number.isInteger(session.episodeNumber)) return;

  try {
    const seasonDetails = await getTVSeasonDetails(session.tmdbId, session.seasonNumber);
    const episode = seasonDetails.episodes.find((item) => item.episode_number === session.episodeNumber);
    if (!episode?.id) return;

    await db.episodeViewingLog.upsert({
      where: {
        userId_tvShowTmdbId_episodeId: {
          userId: session.userId,
          tvShowTmdbId: session.tmdbId,
          episodeId: episode.id,
        },
      },
      create: {
        userId: session.userId,
        tvShowTmdbId: session.tmdbId,
        tvShowTitle: session.title,
        episodeId: episode.id,
        seasonNumber: session.seasonNumber,
        episodeNumber: session.episodeNumber,
        watchedAt,
      },
      update: {
        watchedAt,
      },
    });
  } catch (error) {
    console.error("Failed to sync episode viewing log from watching session", {
      userId: session.userId,
      tmdbId: session.tmdbId,
      seasonNumber: session.seasonNumber,
      episodeNumber: session.episodeNumber,
      error,
    });
  }
}

export async function syncEpisodeViewingFromSessions(sessions: WatchedUpsertSession[], watchedAt: Date): Promise<void> {
  if (!sessions.length) return;
  await Promise.all(sessions.map((session) => syncEpisodeViewingFromSession(session, watchedAt)));
}
