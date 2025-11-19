import { notFound } from "next/navigation";
import PersonDetailPage from "@/components/person/person-detail-page";

interface PageProps {
  params: Promise<{ id: string }>;
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

