import { Metadata } from "next";
import { db } from "@/lib/db";
import PublicPlaylistContent from "@/components/playlists/public-playlist-content";

interface PageProps {
  params: Promise<{ playlistId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { playlistId } = await params;
  
  try {
    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
      include: {
        user: {
          select: {
            displayName: true,
            username: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    if (!playlist || !playlist.isPublic) {
      return {
        title: "Playlist Not Found",
        description: "This playlist is not available.",
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://what2watch2-0.vercel.app";
    const url = `${siteUrl}/playlists/${playlistId}/public`;
    const title = playlist.name;
    const description = playlist.description || `A playlist with ${playlist._count.items} items by ${playlist.user?.username || playlist.user?.displayName || "a user"}`;
    
    // Get first item's poster for OG image if available
    const firstItem = await db.playlistItem.findFirst({
      where: { playlistId: playlist.id },
      orderBy: { order: "asc" },
      select: { posterPath: true },
    });

    const ogImage = firstItem?.posterPath 
      ? `https://image.tmdb.org/t/p/w500${firstItem.posterPath}`
      : `${siteUrl}/what2watch-logo.png`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "What2Watch",
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  } catch (error) {
    console.error("Error generating metadata for public playlist:", error);
    return {
      title: "Playlist",
      description: "View this playlist on What2Watch",
    };
  }
}

export default async function PublicPlaylistPage({ params }: PageProps) {
  const { playlistId } = await params;
  return <PublicPlaylistContent playlistId={playlistId} />;
}

