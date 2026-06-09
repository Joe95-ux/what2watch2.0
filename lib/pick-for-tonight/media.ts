export type PickMedia = "movie" | "tv";

export function normMedia(m: string): PickMedia {
  return m === "tv" ? "tv" : "movie";
}

export function candidateId(tmdbId: number, mediaType: string): string {
  return `${normMedia(mediaType)}:${tmdbId}`;
}
