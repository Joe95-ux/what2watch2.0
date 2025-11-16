import PublicListContent from "@/components/lists/public-list-content";

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  return <PublicListContent listId={listId} />;
}

