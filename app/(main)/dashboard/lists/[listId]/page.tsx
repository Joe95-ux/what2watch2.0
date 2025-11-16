import ListDetailContent from "@/components/lists/list-detail-content";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  return <ListDetailContent listId={listId} />;
}

