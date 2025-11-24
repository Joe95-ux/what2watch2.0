import { db } from "./db";

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export async function generateUniqueChannelSlug(input?: string | null, excludeChannelId?: string) {
  const base = sanitizeSlug(input || "");
  const fallbackBase = base || "channel";

  let attempt = 0;
  while (attempt < 50) {
    const candidateCore = attempt === 0 ? fallbackBase : `${fallbackBase}-${attempt}`;
    const candidate = `@${candidateCore}`;

    const existing = await db.youTubeChannel.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeChannelId) {
      return candidate;
    }

    attempt += 1;
  }

  // As a last resort, append a timestamp
  return `@${fallbackBase}-${Date.now()}`;
}

