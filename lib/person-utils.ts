/**
 * Generate a URL-friendly slug from a person's name
 */
export function createPersonSlug(id: number, name: string): string {
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${id}-${nameSlug}`;
}

/**
 * Extract person ID from a slug (format: "123-name" or just "123")
 */
export function extractPersonIdFromSlug(slug: string): number | null {
  const idStr = slug.split("-")[0];
  const id = parseInt(idStr, 10);
  return isNaN(id) ? null : id;
}

