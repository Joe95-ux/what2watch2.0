import { redirect } from "next/navigation";
import { getTVDetails } from "@/lib/tmdb";
import { createContentSlug } from "@/lib/content-slug";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * This route handles /tv/[id] and redirects to the SEO-friendly /tv/[id]/[slug] format
 * This ensures backward compatibility while always using SEO-friendly URLs
 */
export default async function TVDetailPageRedirect({ params }: PageProps) {
  const { id } = await params;
  const tvId = parseInt(id, 10);

  if (isNaN(tvId)) {
    redirect("/");
  }

  try {
    const tv = await getTVDetails(tvId);
    const slug = createContentSlug(tv.name);
    redirect(`/tv/${tvId}/${slug}`);
  } catch (error) {
    console.error("Error fetching TV details for redirect:", error);
    redirect("/");
  }
}

