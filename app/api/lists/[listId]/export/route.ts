import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb";
import { getOMDBFullData } from "@/lib/omdb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
): Promise<NextResponse> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listId } = await params;

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify list exists and user owns it
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { userId: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch list items ordered by position
    const listItems = await db.listItem.findMany({
      where: { listId },
      orderBy: [
        { position: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Fetch details for all items in parallel
    const itemsWithDetails = await Promise.all(
      listItems.map(async (item) => {
        try {
          let details: any = null;
          let imdbId: string | null = null;
          let synopsis: string | null = null;
          let genres: string[] = [];
          let runtime: number | null = null;
          let directorsOrCreators: string[] = [];
          let imdbRating: number | null = null;

          if (item.mediaType === "movie") {
            details = await getMovieDetails(item.tmdbId);
            const movieDetails = details as typeof details & {
              external_ids?: { imdb_id?: string | null };
              credits?: { crew?: Array<{ job: string; name: string }> };
            };
            imdbId = movieDetails.external_ids?.imdb_id || null;
            synopsis = details.overview || null;
            genres = details.genres?.map((g: { name: string }) => g.name) || [];
            runtime = details.runtime || null;
            const directors = movieDetails.credits?.crew?.filter(
              (person: { job: string; name: string }) => person.job === "Director"
            ) || [];
            directorsOrCreators = directors.map((d: { job: string; name: string }) => d.name);
          } else {
            details = await getTVDetails(item.tmdbId);
            const tvDetails = details as typeof details & {
              external_ids?: { imdb_id?: string | null };
              created_by?: Array<{ name: string }>;
            };
            imdbId = tvDetails.external_ids?.imdb_id || null;
            synopsis = details.overview || null;
            genres = details.genres?.map((g: { name: string }) => g.name) || [];
            // For TV shows, use average episode runtime
            const episodeRuntimes = details.episode_run_time || [];
            runtime = episodeRuntimes.length > 0
              ? Math.round(episodeRuntimes.reduce((a: number, b: number) => a + b, 0) / episodeRuntimes.length)
              : null;
            const creators = tvDetails.created_by || [];
            directorsOrCreators = creators.map((c: { name: string }) => c.name);
          }

          // Fetch IMDb rating if we have IMDb ID
          if (imdbId) {
            try {
              const omdbData = await getOMDBFullData(imdbId);
              if (omdbData?.imdbRating && omdbData.imdbRating > 0) {
                imdbRating = omdbData.imdbRating;
              }
            } catch (error) {
              console.error("Error fetching OMDB rating:", error);
            }
          }

          const releaseDate = item.mediaType === "movie"
            ? item.releaseDate
            : item.firstAirDate;
          const releaseYear = releaseDate
            ? new Date(releaseDate).getFullYear()
            : null;
          const url = `${request.nextUrl.origin}/${item.mediaType}/${item.tmdbId}`;

          return {
            position: item.position,
            title: item.title,
            type: item.mediaType === "movie" ? "Movie" : "TV Show",
            url,
            imdbId: imdbId || "",
            releaseDate: releaseDate || "",
            year: releaseYear?.toString() || "",
            genre: genres.join(", "),
            description: synopsis || "",
            directorsCreators: directorsOrCreators.join(", "),
            runtime: runtime ? `${Math.floor(runtime / 60)}h ${runtime % 60}m` : "",
            imdbRating: imdbRating?.toFixed(1) || "",
            dateCreated: new Date(item.createdAt).toISOString().split("T")[0],
          };
        } catch (error) {
          // If fetching details fails, return basic info
          const releaseDate = item.mediaType === "movie"
            ? item.releaseDate
            : item.firstAirDate;
          const releaseYear = releaseDate
            ? new Date(releaseDate).getFullYear()
            : null;
          const url = `${request.nextUrl.origin}/${item.mediaType}/${item.tmdbId}`;

          return {
            position: item.position,
            title: item.title,
            type: item.mediaType === "movie" ? "Movie" : "TV Show",
            url,
            imdbId: "",
            releaseDate: releaseDate || "",
            year: releaseYear?.toString() || "",
            genre: "",
            description: "",
            directorsCreators: "",
            runtime: "",
            imdbRating: "",
            dateCreated: new Date(item.createdAt).toISOString().split("T")[0],
          };
        }
      })
    );

    return NextResponse.json({ items: itemsWithDetails });
  } catch (error) {
    console.error("Export list API error:", error);
    return NextResponse.json(
      { error: "Failed to export list" },
      { status: 500 }
    );
  }
}

