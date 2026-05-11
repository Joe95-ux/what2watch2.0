/** Canonical path for a title detail page (matches dashboard `Link` usage). */
export function watchTitleHref(mediaType: "movie" | "tv", tmdbId: number, title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `/${mediaType}/${tmdbId}/${slug || "title"}`;
}
