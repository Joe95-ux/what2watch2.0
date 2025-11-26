import { ChannelListDetail } from "@/components/youtube/channel-lists/channel-list-detail";

interface PageProps {
  params: Promise<{ listId: string }>;
}

export default async function YouTubeChannelListDetailPage({
  params,
}: PageProps) {
  const { listId } = await params;
  return <ChannelListDetail listId={listId} />;
}

