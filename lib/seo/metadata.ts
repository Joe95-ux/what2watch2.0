import type { Metadata } from "next";
import { createContentSlug } from "@/lib/content-slug";
import { truncateMetaDescription } from "@/lib/content-detail-seo";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

export const SITE_NAME = "What2Watch";

export const DEFAULT_OG_IMAGE_PATH = "/what2watch-logo.png";

export function defaultOgImageUrl(): string {
  return absoluteUrl(DEFAULT_OG_IMAGE_PATH);
}

export const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
};

export const noIndexMetadata: Metadata = {
  robots: noIndexRobots,
};

export function tmdbPosterUrl(
  posterPath: string | null | undefined,
  size: "w500" | "w780" | "original" = "w500",
): string | undefined {
  if (!posterPath?.trim()) return undefined;
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

export function tmdbBackdropUrl(
  backdropPath: string | null | undefined,
  size: "w780" | "w1280" | "original" = "w1280",
): string | undefined {
  if (!backdropPath?.trim()) return undefined;
  return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
}

type BuildPageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  noIndex?: boolean;
};

/** Metadata for static marketing / browse pages. */
export function buildPageMetadata({
  title,
  description,
  path,
  ogImage,
  noIndex,
}: BuildPageMetadataOptions): Metadata {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const url = path ? absoluteUrl(path) : undefined;
  const image = ogImage ?? defaultOgImageUrl();

  return {
    title: fullTitle,
    description,
    ...(noIndex ? { robots: noIndexRobots } : {}),
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      type: "website",
      ...(url ? { url } : {}),
      images: [{ url: image, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

type ContentDetailMetadataOptions = {
  type: "movie" | "tv";
  id: number;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
};

export function buildContentDetailMetadata({
  type,
  id,
  title,
  overview,
  posterPath,
  backdropPath,
}: ContentDetailMetadataOptions): Metadata {
  const pageTitle = `Where to Watch ${title} | ${SITE_NAME}`;
  const rawDescription = overview?.trim()
    ? `Where to watch ${title}. ${truncateMetaDescription(overview)}`
    : `Where to watch ${title} — streaming, buy, and rent options on What2Watch.`;
  const description =
    rawDescription.length > 160
      ? `${rawDescription.slice(0, 157).trimEnd()}…`
      : rawDescription;
  const slug = createContentSlug(title);
  const path = `/${type}/${id}/${slug}`;
  const url = absoluteUrl(path);
  const ogImage =
    tmdbBackdropUrl(backdropPath, "w1280") ||
    tmdbPosterUrl(posterPath, "w780") ||
    defaultOgImageUrl();
  const ogType = type === "movie" ? "video.movie" : "video.tv_show";

  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: pageTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: ogType,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [ogImage],
    },
  };
}

type ShareMetadataOptions = {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
};

export function buildShareMetadata({
  title,
  description,
  path,
  ogImage,
}: ShareMetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const image = ogImage ?? defaultOgImageUrl();
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

/** Root layout defaults — call from app/layout.tsx metadata export. */
export function rootLayoutMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const defaultDescription =
    "A movie and TV show watch guide like no other. Find, organize, and share your favorite content with personalized recommendations.";
  const ogImage = defaultOgImageUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${SITE_NAME} — Discover Your Next Favorite Watch`,
      template: `%s | ${SITE_NAME}`,
    },
    description: defaultDescription,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Discover Your Next Favorite Watch`,
      description: defaultDescription,
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — Discover Your Next Favorite Watch`,
      description: defaultDescription,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}
