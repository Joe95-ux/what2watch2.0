import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import PlaylistDetailContent from "@/components/playlists/playlist-detail-content";
import PublicPlaylistContent from "@/components/playlists/public-playlist-content";
import { Metadata } from "next";
import { buildShareMetadata, tmdbPosterUrl } from "@/lib/seo/metadata";

interface PageProps {
  params: Promise<{ playlistId: string }>;
  searchParams: Promise<{ public?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { playlistId } = await params;
  const { public: isPublic } = await searchParams;
  
  // Only generate metadata for public playlists
  if (isPublic !== "true") {
    return {
      title: "Playlist",
      description: "View this playlist on What2Watch",
    };
  }
  
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

    const title = playlist.name;
    const description =
      playlist.description ||
      `A playlist with ${playlist._count.items} items by ${playlist.user?.username || playlist.user?.displayName || "a user"}`;

    const firstItem = await db.playlistItem.findFirst({
      where: { playlistId: playlist.id },
      orderBy: { order: "asc" },
      select: { posterPath: true },
    });

    return buildShareMetadata({
      title,
      description,
      path: `/playlists/${playlistId}?public=true`,
      ogImage: tmdbPosterUrl(firstItem?.posterPath, "w500"),
    });
  } catch (error) {
    console.error("Error generating metadata for playlist:", error);
    return {
      title: "Playlist",
      description: "View this playlist on What2Watch",
    };
  }
}

export default async function PlaylistDetailPage({ params, searchParams }: PageProps) {
  const { playlistId } = await params;
  const { public: isPublic } = await searchParams;

  // If ?public=true, allow unauthenticated access and use PublicPlaylistContent
  if (isPublic === "true") {
    return <PublicPlaylistContent playlistId={playlistId} />;
  }

  // Otherwise, require authentication and use PlaylistDetailContent
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user has completed onboarding
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { preferences: true },
  });

  if (!user) {
    redirect("/onboarding");
  }

  if (!user.preferences?.onboardingCompleted) {
    redirect("/onboarding");
  }

  return <PlaylistDetailContent playlistId={playlistId} />;
}

