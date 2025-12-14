import { db } from "./db";

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateUniqueForumPostSlug(title: string, excludePostId?: string): Promise<string> {
  const base = sanitizeSlug(title);
  const fallbackBase = base || "post";

  let attempt = 0;
  while (attempt < 50) {
    const candidate = attempt === 0 ? fallbackBase : `${fallbackBase}-${attempt}`;

    const existing = await db.forumPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludePostId) {
      return candidate;
    }

    attempt += 1;
  }

  // As a last resort, append a timestamp
  return `${fallbackBase}-${Date.now()}`;
}

