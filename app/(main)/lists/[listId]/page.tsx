import { Metadata } from "next";
import { db } from "@/lib/db";
import PublicListContent from "@/components/lists/public-list-content";
import { buildShareMetadata, tmdbPosterUrl } from "@/lib/seo/metadata";

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

    const title = list.name;
    const description =
      list.description ||
      `A list with ${list._count.items} items by ${list.user?.username || list.user?.displayName || "a user"}`;

    const firstItem = await db.listItem.findFirst({
      where: { listId: list.id },
      orderBy: { position: "asc" },
      select: { posterPath: true },
    });

    return buildShareMetadata({
      title,
      description,
      path: `/lists/${listId}`,
      ogImage: tmdbPosterUrl(firstItem?.posterPath, "w500"),
    });
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

