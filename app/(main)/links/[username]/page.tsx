import { Metadata } from "next";
import { notFound } from "next/navigation";
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

  const user = await db.user.findUnique({
    where: { username: username.trim() },
    select: {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      linkPage: { select: { bio: true, theme: true } },
      userLinks: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, label: true, url: true, icon: true },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const linkPage = user.linkPage;
  const theme = (linkPage?.theme as LinkPageTheme | null) ?? null;

  return (
    <PublicLinksPage
      displayName={user.displayName}
      username={user.username}
      avatarUrl={user.avatarUrl}
      bio={linkPage?.bio ?? null}
      theme={theme}
      links={user.userLinks}
    />
  );
}
