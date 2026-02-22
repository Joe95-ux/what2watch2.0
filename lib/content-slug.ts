/**
 * Generate a URL-friendly slug from a movie or TV show title
 */
export function createContentSlug(title: string): string {
  if (!title) return "";
  
  return title
    .toLowerCase()
    .trim()
    // Replace special characters and spaces with hyphens
    .replace(/[^a-z0-9]+/g, "-")
    // Replace multiple consecutive hyphens with a single hyphen
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate the full URL path for a movie or TV show
 * Format: /movie/12345/the-dark-knight or /tv/67890/breaking-bad
 */
export function createContentUrl(
  type: "movie" | "tv",
  id: number,
  title: string
): string {
  const slug = createContentSlug(title);
  return `/${type}/${id}${slug ? `/${slug}` : ""}`;
}

/**
 * Extract content ID from URL path
 * Handles both formats: /movie/12345 and /movie/12345/the-dark-knight
 */
export function extractContentIdFromPath(path: string): number | null {
  // Remove leading slash and split by /
  const parts = path.replace(/^\//, "").split("/");
  
  // Should have at least 2 parts: [type, id] or [type, id, slug]
  if (parts.length < 2) return null;
  
  const idStr = parts[1];
  const id = parseInt(idStr, 10);
  return isNaN(id) ? null : id;
}
