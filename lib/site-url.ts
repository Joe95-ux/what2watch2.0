/** Canonical production origin (no trailing slash). */
export const PRODUCTION_SITE_URL = "https://what2watch.net";

const DEV_FALLBACK = "http://localhost:3000";

function normalizeOrigin(raw: string): string {
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}

/**
 * Canonical site origin for metadata, sitemap, and robots.
 * Does not rely solely on NEXT_PUBLIC_SITE_URL — Vercel can mark it sensitive
 * and an empty/misconfigured value previously sent canonicals to *.vercel.app.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return normalizeOrigin(explicit);
  }

  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return normalizeOrigin(vercelUrl);
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_FALLBACK;
  }

  return PRODUCTION_SITE_URL;
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}
