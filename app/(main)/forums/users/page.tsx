import { ForumUsersContent } from "@/components/forum/forum-users-content";

// Force dynamic rendering since this page uses client-side URL mutations (router.replace)
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    sortBy?: string;
    order?: string;
  }>;
}

export default async function ForumUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  return (
    <ForumUsersContent
      initialSearch={params.search || ""}
      initialSortBy={(params.sortBy as "reputation" | "posts" | "replies" | "joinDate" | "lastActive") || "reputation"}
      initialSortOrder={(params.order as "asc" | "desc") || "desc"}
    />
  );
}

