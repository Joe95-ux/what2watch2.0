import { getMovieDetails, getTVDetails } from "@/lib/tmdb";

export const EDITORIAL_TAG = "__editorial__";
export const ITEM_TAG_PREFIX = "__item__:";
export const GENRE_TAG_PREFIX = "__genre__:";

type ListItemLike = {
  tmdbId: number;
  mediaType: "movie" | "tv";
};

export function isSystemListTag(tag: string): boolean {
  return (
    tag === EDITORIAL_TAG ||
    tag.startsWith(ITEM_TAG_PREFIX) ||
    tag.startsWith(GENRE_TAG_PREFIX)
  );
}

export function toItemTag(mediaType: "movie" | "tv", tmdbId: number): string {
  return `${ITEM_TAG_PREFIX}${mediaType}:${tmdbId}`;
}

export function toGenreTag(genreId: number): string {
  return `${GENRE_TAG_PREFIX}${genreId}`;
}

export function stripSystemListTags(tags: string[]): string[] {
  return tags.filter((tag) => !isSystemListTag(tag));
}

export function keepSystemListTags(tags: string[]): string[] {
  return tags.filter((tag) => isSystemListTag(tag));
}

export async function buildRelatedMetadataTags(items: ListItemLike[]): Promise<string[]> {
  const itemTagSet = new Set<string>();
  const genreTagSet = new Set<string>();
  const contentGenreCache = new Map<string, number[]>();

  for (const item of items) {
    const key = `${item.mediaType}:${item.tmdbId}`;
    itemTagSet.add(toItemTag(item.mediaType, item.tmdbId));

    if (!contentGenreCache.has(key)) {
      try {
        if (item.mediaType === "movie") {
          const details = await getMovieDetails(item.tmdbId);
          contentGenreCache.set(
            key,
            (details.genres || []).map((g) => g.id),
          );
        } else {
          const details = await getTVDetails(item.tmdbId);
          contentGenreCache.set(
            key,
            (details.genres || []).map((g) => g.id),
          );
        }
      } catch {
        contentGenreCache.set(key, []);
      }
    }

    const genreIds = contentGenreCache.get(key) || [];
    for (const genreId of genreIds) {
      genreTagSet.add(toGenreTag(genreId));
    }
  }

  return [...itemTagSet, ...genreTagSet];
}

