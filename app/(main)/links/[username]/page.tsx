import { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { PublicLinksPage } from "@/components/links/public-links-page";
import type { LinkPageTheme } from "@/components/links/public-links-page";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  if (!username?.trim()) {
    return { title: "Links" };
  }

  const user = await db.user.findUnique({
    where: { username: username.trim() },
    select: { displayName: true, username: true },
  });

  if (!user) {
    return { title: "Page not found" };
  }

  const title = user.displayName || (user.username ? `@${user.username}` : "Links");
  const description = "Link in bio – all my links in one place.";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://what2watch2-0.vercel.app";
  const url = `${siteUrl}/links/${username}`;

  return {
    title: `${title} | Links`,
    description,
    openGraph: {
      title: `${title} | Links`,
      description,
      url,
      siteName: "What2Watch",
    },
  };
}

export default async function LinksPage({ params }: PageProps) {
  const { username } = await params;
  if (!username?.trim()) {
    notFound();
  }

  const { userId: clerkUserId } = await auth();
  const user = await db.user.findUnique({
    where: { username: username.trim() },
    select: {
      id: true,
      clerkId: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      linkPage: { select: { bio: true, theme: true } },
      userLinks: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, label: true, url: true, icon: true, resourceType: true, resourceId: true, bannerImageUrl: true, customDescription: true, isSensitiveContent: true },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const linkPage = user.linkPage;
  const theme = (linkPage?.theme as LinkPageTheme | null) ?? null;
  const isOwner = !!clerkUserId && user.clerkId === clerkUserId;

  /** Parse link URL to detect playlist or list id (when resourceType/resourceId not set). */
  function parseLinkResource(url: string): { type: "playlist"; id: string } | { type: "list"; id: string } | null {
    try {
      const href = url.startsWith("http") ? url : `https://dummy${url.startsWith("/") ? "" : "/"}${url}`;
      const pathname = new URL(href).pathname;
      const playlistMatch = pathname.match(/^\/playlists\/([a-zA-Z0-9_-]+)(?:\/public)?\/?$/);
      if (playlistMatch) return { type: "playlist", id: playlistMatch[1] };
      const listMatch = pathname.match(/^\/lists\/([a-zA-Z0-9_-]+)\/?$/);
      if (listMatch) return { type: "list", id: listMatch[1] };
    } catch {
      // ignore invalid URLs
    }
    return null;
  }

  function truncateToOneLine(text: string | null | undefined): string | null {
    if (!text || !text.trim()) return null;
    const firstLine = text.trim().split(/\n/)[0]?.trim();
    return firstLine ?? null;
  }

  type LinkWithPreview = (typeof user.userLinks)[number] & {
    listPreview?: { name: string; description: string | null; coverImageUrl: string | null };
    playlistPreview?: { name: string; description: string | null; coverImageUrl: string | null };
    customPreview?: { coverImageUrl: string; description: string | null };
  };

  const links: LinkWithPreview[] = await Promise.all(
    user.userLinks.map(async (link) => {
      const base = { ...link };
      const parsed = parseLinkResource(link.url);
      const listId = link.resourceType === "list" && link.resourceId ? link.resourceId : parsed?.type === "list" ? parsed.id : null;
      const playlistId = link.resourceType === "playlist" && link.resourceId ? link.resourceId : parsed?.type === "playlist" ? parsed.id : null;

      if (listId) {
        const list = await db.list.findFirst({
          where: { id: listId, userId: user.id },
          select: {
            name: true,
            description: true,
            coverImage: true,
            items: { take: 1, orderBy: { position: "asc" }, select: { backdropPath: true } },
          },
        });
        if (list) {
          const coverImageUrl = list.coverImage?.startsWith("http")
            ? list.coverImage
            : list.items[0]?.backdropPath
              ? `https://image.tmdb.org/t/p/w780${list.items[0].backdropPath}`
              : null;
          return { ...base, listPreview: { name: list.name, description: list.description, coverImageUrl } };
        }
      }
      if (playlistId) {
        const playlist = await db.playlist.findFirst({
          where: { id: playlistId, userId: user.id },
          select: {
            name: true,
            description: true,
            coverImage: true,
            items: { take: 1, orderBy: { order: "asc" }, select: { backdropPath: true } },
          },
        });
        if (playlist) {
          const coverImageUrl = playlist.coverImage?.startsWith("http")
            ? playlist.coverImage
            : playlist.items[0]?.backdropPath
              ? `https://image.tmdb.org/t/p/w780${playlist.items[0].backdropPath}`
              : null;
          return { ...base, playlistPreview: { name: playlist.name, description: playlist.description, coverImageUrl } };
        }
      }
      if (link.bannerImageUrl) {
        return { ...base, customPreview: { coverImageUrl: link.bannerImageUrl, description: truncateToOneLine(link.customDescription) } };
      }
      return base;
    })
  );

  return (
    <PublicLinksPage
      displayName={user.displayName}
      username={user.username}
      avatarUrl={user.avatarUrl}
      bio={linkPage?.bio ?? null}
      theme={theme}
      links={links}
      isOwner={isOwner}
    />
  );
}
