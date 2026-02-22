import { redirect } from "next/navigation";
import { getMovieDetails } from "@/lib/tmdb";
import { createContentSlug } from "@/lib/content-slug";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * This route handles /movie/[id] and redirects to the SEO-friendly /movie/[id]/[slug] format
 * This ensures backward compatibility while always using SEO-friendly URLs
 */
export default async function MovieDetailPageRedirect({ params }: PageProps) {
  const { id } = await params;
  const movieId = parseInt(id, 10);

  if (isNaN(movieId)) {
    redirect("/");
  }

  try {
    const movie = await getMovieDetails(movieId);
    const slug = createContentSlug(movie.title);
    redirect(`/movie/${movieId}/${slug}`);
  } catch (error) {
    console.error("Error fetching movie details for redirect:", error);
    redirect("/");
  }
}

