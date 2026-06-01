import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PersonDetailPage from "@/components/person/person-detail-page";
import { getPersonDetails } from "@/lib/tmdb";
import { buildPageMetadata, tmdbPosterUrl } from "@/lib/seo/metadata";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const personId = parseInt(id.split("-")[0], 10);
  if (Number.isNaN(personId)) {
    return { title: "Person" };
  }
  try {
    const person = await getPersonDetails(personId);
    const knownFor = person.known_for_department?.trim();
    const description = knownFor
      ? `Filmography and credits for ${person.name} (${knownFor}) on What2Watch.`
      : `Explore movies and TV featuring ${person.name} on What2Watch.`;
    return buildPageMetadata({
      title: person.name,
      description,
      path: `/person/${id}`,
      ogImage: tmdbPosterUrl(person.profile_path, "w500"),
    });
  } catch {
    return { title: "Person" };
  }
}

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params;
  
  // Extract ID from slug (format: "123-name" or just "123")
  const personIdStr = id.split("-")[0];
  const personId = parseInt(personIdStr, 10);

  if (isNaN(personId)) {
    notFound();
  }

  return <PersonDetailPage personId={personId} />;
}

