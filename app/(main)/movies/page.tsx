import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import MoviesContent from "@/components/browse/movies-content";

export default async function MoviesPage() {
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
    <MoviesContent
      favoriteGenres={user.preferences.favoriteGenres}
      preferredTypes={(user.preferences.preferredTypes || ["movie"]) as ("movie" | "tv")[]}
    />
  );
}

