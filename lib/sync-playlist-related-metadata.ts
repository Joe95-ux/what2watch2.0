import { db } from "@/lib/db";
import { buildRelatedMetadataTags, stripSystemListTags } from "@/lib/list-related-metadata";

/**
 * Recomputes item/genre fingerprint tags from TMDB playlist items and persists them.
 * Mirrors list related-metadata behavior (no editorial tag on playlists).
 */
export async function syncPlaylistRelatedMetadata(playlistId: string): Promise<void> {
  const playlist = await db.playlist.findUnique({
    where: { id: playlistId },
    select: { id: true, tags: true },
  });
  if (!playlist) return;

  const items = await db.playlistItem.findMany({
    where: { playlistId },
    orderBy: { order: "asc" },
    select: { tmdbId: true, mediaType: true },
  });

  const metadataTags = await buildRelatedMetadataTags(
    items.map((i) => ({
      tmdbId: i.tmdbId,
      mediaType: i.mediaType as "movie" | "tv",
    })),
  );

  await db.playlist.update({
    where: { id: playlistId },
    data: {
      tags: [...stripSystemListTags(playlist.tags ?? []), ...metadataTags],
    },
  });
}
