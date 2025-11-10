import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import PlaylistsContent from "@/components/playlists/playlists-content";

export default async function PlaylistsPage() {
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

  return <PlaylistsContent />;
}

