import BrowseContent from "@/components/browse/browse-content";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export default async function BrowsePage() {
  const { userId } = await auth();
  
  // If user is authenticated, try to get their preferences
  let favoriteGenres: number[] = [];
  let preferredTypes: ("movie" | "tv")[] = ["movie", "tv"];
  
  if (userId) {
    try {
      const user = await db.user.findUnique({
        where: { clerkId: userId },
        include: { preferences: true },
      });

      if (user?.preferences) {
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

        favoriteGenres = normalizeGenres(user.preferences.favoriteGenres || []);
        preferredTypes = (user.preferences.preferredTypes || ["movie", "tv"]) as ("movie" | "tv")[];
      }
    } catch (error) {
      // If there's an error fetching user preferences, just use defaults
      console.error("Error fetching user preferences:", error);
    }
  }

  return (
    <BrowseContent
      favoriteGenres={favoriteGenres}
      preferredTypes={preferredTypes}
    />
  );
}

