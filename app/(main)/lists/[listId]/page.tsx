import { Metadata } from "next";
import { db } from "@/lib/db";
import PublicListContent from "@/components/lists/public-list-content";

interface PageProps {
  params: Promise<{ listId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listId } = await params;
  
  try {
    const list = await db.list.findUnique({
      where: { id: listId },
      include: {
        user: {
          select: {
            displayName: true,
            username: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    if (!list || list.visibility === "PRIVATE") {
      return {
        title: "List Not Found",
        description: "This list is not available.",
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://what2watch2-0.vercel.app";
    const url = `${siteUrl}/lists/${listId}`;
    const title = list.name;
    const description = list.description || `A list with ${list._count.items} items by ${list.user?.displayName || list.user?.username || "a user"}`;
    
    // Get first item's poster for OG image if available
    const firstItem = await db.listItem.findFirst({
      where: { listId: list.id },
      orderBy: { position: "asc" },
      select: { posterPath: true },
    });

    const ogImage = firstItem?.posterPath 
      ? `https://image.tmdb.org/t/p/w500${firstItem.posterPath}`
      : `${siteUrl}/what2watch-logo.png`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "What2Watch",
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  } catch (error) {
    console.error("Error generating metadata for public list:", error);
    return {
      title: "List",
      description: "View this list on What2Watch",
    };
  }
}

export default async function PublicListPage({ params }: PageProps) {
  const { listId } = await params;
  return <PublicListContent listId={listId} />;
}

