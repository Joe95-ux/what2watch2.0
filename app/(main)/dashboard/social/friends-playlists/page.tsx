import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import FriendsPlaylistsContent from "@/components/social/friends-playlists-content";

export default async function FriendsPlaylistsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { preferences: true },
  });

  if (!user || !user.preferences?.onboardingCompleted) {
    redirect("/onboarding");
  }

  return <FriendsPlaylistsContent />;
}

