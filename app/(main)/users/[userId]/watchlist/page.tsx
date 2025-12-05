import { Metadata } from "next";
import { db } from "@/lib/db";
import PublicWatchlistContent from "@/components/watchlist/public-watchlist-content";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        displayName: true,
        watchlistIsPublic: true,
      },
    });

    if (!user || !user.watchlistIsPublic) {
      return {
        title: "Watchlist Not Found",
        description: "This watchlist is not available.",
      };
    }

    const watchlistCount = await db.watchlistItem.count({
      where: { userId },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://what2watch2-0.vercel.app";
    const url = `${siteUrl}/users/${userId}/watchlist`;
    const title = `${user.displayName || user.username || "User"}'s Watchlist`;
    const description = `A collection of ${watchlistCount} movies and TV shows ${user.displayName || user.username || "this user"} wants to watch.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "What2Watch",
        type: "website",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for public watchlist:", error);
    return {
      title: "Watchlist",
      description: "View this watchlist on What2Watch",
    };
  }
}

export default async function PublicWatchlistPage({ params }: PageProps) {
  const { userId } = await params;
  return <PublicWatchlistContent userId={userId} />;
}

