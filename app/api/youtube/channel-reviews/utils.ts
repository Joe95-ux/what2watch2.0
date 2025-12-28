export function sanitizeReviewTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const cleaned = input
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter((tag) => tag.length > 0)
    .slice(0, 8);

  const unique = Array.from(new Set(cleaned.map((tag) => tag.toLowerCase())));

  return unique.map((tag) => tag.replace(/^\w/, (char) => char.toUpperCase()));
}

export function clampChannelReviewRating(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const rating = Number(value);
  if (isNaN(rating)) return null;
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  return clamped === 0 ? null : clamped;
}
