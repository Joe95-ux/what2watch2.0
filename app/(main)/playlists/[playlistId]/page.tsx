import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import PlaylistDetailContent from "@/components/playlists/playlist-detail-content";

interface PageProps {
  params: Promise<{ playlistId: string }>;
}

export default async function PlaylistDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  const { playlistId } = await params;

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

