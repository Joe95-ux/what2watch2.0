import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { createContentUrl } from "@/lib/content-slug";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

const STATIC_PATHS = [
  "/",
  "/browse",
  "/popular",
  "/top-rated",
  "/editorial",
  "/lists",
  "/search",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/nollywood",
  "/members",
] as const;

const MAX_LISTS = 2_000;
const MAX_CONTENT_URLS = 5_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: path === "/" ? siteUrl : absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" || path === "/browse" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/browse" ? 0.9 : 0.7,
  }));

  let listEntries: MetadataRoute.Sitemap = [];
  let contentEntries: MetadataRoute.Sitemap = [];

  try {
    const [lists, listItems] = await Promise.all([
      db.list.findMany({
        where: { visibility: "PUBLIC" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_LISTS,
      }),
      db.listItem.findMany({
        where: { list: { visibility: "PUBLIC" } },
        select: { tmdbId: true, mediaType: true, title: true },
        take: MAX_CONTENT_URLS * 2,
      }),
    ]);

    listEntries = lists.map((list) => ({
      url: absoluteUrl(`/lists/${list.id}`),
      lastModified: list.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    const seen = new Set<string>();
    for (const item of listItems) {
      if (item.mediaType !== "movie" && item.mediaType !== "tv") continue;
      const key = `${item.mediaType}:${item.tmdbId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (seen.size > MAX_CONTENT_URLS) break;

      contentEntries.push({
        url: absoluteUrl(
          createContentUrl(item.mediaType as "movie" | "tv", item.tmdbId, item.title),
        ),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("[sitemap] Failed to load dynamic URLs:", error);
  }

  return [...staticEntries, ...listEntries, ...contentEntries];
}
