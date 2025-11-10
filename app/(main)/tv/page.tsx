import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import TVContent from "@/components/browse/tv-content";

export default async function TVPage() {
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

  return (
    <TVContent
      favoriteGenres={user.preferences.favoriteGenres}
      preferredTypes={(user.preferences.preferredTypes || ["tv"]) as ("movie" | "tv")[]}
    />
  );
}

