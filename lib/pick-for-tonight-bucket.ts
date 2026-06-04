/** Aligns with client localStorage cache — rotation changes TMDB page, not poll interval. */
export function getPickForTonightBucket(date = new Date()): string {
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const bucket = Math.floor(date.getHours() / 6);
  return `${day}-${bucket}`;
}

/** 6 hours — matches bucket length. */
export const PICK_FOR_TONIGHT_CACHE_SECONDS = 6 * 60 * 60;
