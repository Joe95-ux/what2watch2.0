/** Matches watching room card `key` in dashboard (episode-specific for TV). */
export function watchPartyFeedRoomKey(
  tmdbId: number,
  mediaType: "movie" | "tv",
  seasonNumber: number | null | undefined,
  episodeNumber: number | null | undefined
): string {
  if (
    mediaType === "tv" &&
    typeof seasonNumber === "number" &&
    Number.isInteger(seasonNumber) &&
    seasonNumber > 0 &&
    typeof episodeNumber === "number" &&
    Number.isInteger(episodeNumber) &&
    episodeNumber > 0
  ) {
    return `${mediaType}:${tmdbId}:s${seasonNumber}:e${episodeNumber}`;
  }
  return `${mediaType}:${tmdbId}`;
}
