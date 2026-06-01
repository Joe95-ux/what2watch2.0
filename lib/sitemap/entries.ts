import { db } from "@/lib/db";
import { createContentUrl } from "@/lib/content-slug";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  /** For HTML sitemap grouping */
  category?: string;
};

const STATIC_PATHS: Array<{ path: string; priority: number; changeFrequency: SitemapEntry["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/browse", priority: 0.9, changeFrequency: "daily" },
  { path: "/popular", priority: 0.8, changeFrequency: "daily" },
  { path: "/top-rated", priority: 0.8, changeFrequency: "weekly" },
  { path: "/editorial", priority: 0.8, changeFrequency: "weekly" },
  { path: "/lists", priority: 0.8, changeFrequency: "daily" },
  { path: "/forum", priority: 0.75, changeFrequency: "daily" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
  { path: "/nollywood", priority: 0.7, changeFrequency: "weekly" },
  { path: "/sitemap", priority: 0.3, changeFrequency: "weekly" },
];

const MAX_LISTS = 2_000;
const MAX_CONTENT_URLS = 5_000;
const MAX_FORUM_POSTS = 5_000;
const MAX_PLAYLISTS = 2_000;
const MAX_LINK_PAGES = 2_000;

function staticEntries(now: Date): SitemapEntry[] {
  return STATIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: path === "/" ? getSiteUrl() : absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
    category: "Main pages",
  }));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function entriesToSitemapXml(entries: SitemapEntry[]): string {
  const urlNodes = entries
    .map((entry) => {
      const parts = [
        "  <url>",
        `    <loc>${escapeXml(entry.url)}</loc>`,
      ];
      if (entry.lastModified) {
        parts.push(`    <lastmod>${entry.lastModified.toISOString()}</lastmod>`);
      }
      if (entry.changeFrequency) {
        parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      }
      if (entry.priority != null) {
        parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }
      parts.push("  </url>");
      return parts.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`;
}

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const now = new Date();
  const entries: SitemapEntry[] = [...staticEntries(now)];

  try {
    const [lists, listItems, forumPosts, playlists, linkUsers] = await Promise.all([
      db.list.findMany({
        where: { visibility: "PUBLIC" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_LISTS,
      }),
      db.listItem.findMany({
        where: { list: { visibility: "PUBLIC" } },
        select: { tmdbId: true, mediaType: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: MAX_CONTENT_URLS * 2,
      }),
      db.forumPost.findMany({
        where: { status: "PUBLIC", isHidden: false },
        select: { id: true, slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_FORUM_POSTS,
      }),
      db.playlist.findMany({
        where: { visibility: "PUBLIC" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_PLAYLISTS,
      }),
      db.user.findMany({
        where: {
          username: { not: null },
          linkPage: { isNot: null },
        },
        select: { username: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_LINK_PAGES,
      }),
    ]);

    for (const list of lists) {
      entries.push({
        url: absoluteUrl(`/lists/${list.id}`),
        lastModified: list.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
        category: "Public lists",
      });
    }

    const seenContent = new Set<string>();
    for (const item of listItems) {
      if (item.mediaType !== "movie" && item.mediaType !== "tv") continue;
      const key = `${item.mediaType}:${item.tmdbId}`;
      if (seenContent.has(key)) continue;
      seenContent.add(key);
      if (seenContent.size > MAX_CONTENT_URLS) break;

      entries.push({
        url: absoluteUrl(
          createContentUrl(item.mediaType as "movie" | "tv", item.tmdbId, item.title),
        ),
        lastModified: item.createdAt,
        changeFrequency: "weekly",
        priority: 0.8,
        category: "Movies & TV",
      });
    }

    for (const post of forumPosts) {
      entries.push({
        url: absoluteUrl(`/forum/${post.slug || post.id}`),
        lastModified: post.updatedAt,
        changeFrequency: "weekly",
        priority: 0.65,
        category: "Forum",
      });
    }

    for (const playlist of playlists) {
      entries.push({
        url: absoluteUrl(`/playlists/${playlist.id}?public=true`),
        lastModified: playlist.updatedAt,
        changeFrequency: "weekly",
        priority: 0.55,
        category: "Public playlists",
      });
    }

    for (const user of linkUsers) {
      if (!user.username?.trim()) continue;
      entries.push({
        url: absoluteUrl(`/links/${user.username.trim()}`),
        lastModified: user.updatedAt,
        changeFrequency: "weekly",
        priority: 0.5,
        category: "Link pages",
      });
    }
  } catch (error) {
    console.error("[sitemap] Failed to load dynamic URLs:", error);
  }

  return entries;
}

export function groupEntriesByCategory(entries: SitemapEntry[]): Map<string, SitemapEntry[]> {
  const groups = new Map<string, SitemapEntry[]>();
  for (const entry of entries) {
    const category = entry.category ?? "Other";
    const list = groups.get(category) ?? [];
    list.push(entry);
    groups.set(category, list);
  }
  return groups;
}
