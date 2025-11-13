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

  // Normalize favoriteGenres - handle Extended JSON format from MongoDB
  const normalizeGenres = (genres: unknown[]): number[] => {
    return genres
      .map((g) => {
        // Handle Extended JSON format: {"$numberLong":"18"} or {"$numberInt":"18"}
        if (typeof g === "object" && g !== null) {
          const obj = g as Record<string, unknown>;
          if ("$numberLong" in obj && typeof obj.$numberLong === "string") {
            return Number.parseInt(obj.$numberLong, 10);
          }
          if ("$numberInt" in obj && typeof obj.$numberInt === "string") {
            return Number.parseInt(obj.$numberInt, 10);
          }
        }
        // Handle regular numbers or string numbers
        if (typeof g === "number") return g;
        if (typeof g === "string") {
          const parsed = Number.parseInt(g, 10);
          return Number.isNaN(parsed) ? null : parsed;
        }
        return null;
      })
      .filter((g): g is number => g !== null && !Number.isNaN(g));
  };

  const favoriteGenres = normalizeGenres(user.preferences?.favoriteGenres || []);

  return (
    <MoviesContent
      favoriteGenres={favoriteGenres}
      preferredTypes={(user.preferences?.preferredTypes || ["movie"]) as ("movie" | "tv")[]}
    />
  );
}

