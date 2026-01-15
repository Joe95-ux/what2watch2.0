import { ForumFilterContent } from "@/components/forum/forum-filter-content";

// Force dynamic rendering since this page uses client-side URL mutations (router.replace)
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    sortBy?: string;
    order?: string;
    category?: string;
  }>;
}

export default async function ForumFilterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  return (
    <ForumFilterContent
      initialSearch={params.search || ""}
      initialSortBy={(params.sortBy as "createdAt" | "views" | "replyCount" | "updatedAt") || "updatedAt"}
      initialSortOrder={(params.order as "asc" | "desc") || "desc"}
      initialCategory={params.category || "all"}
    />
  );
}

