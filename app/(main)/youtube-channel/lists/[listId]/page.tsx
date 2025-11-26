import { ChannelListDetail } from "@/components/youtube/channel-lists/channel-list-detail";

export default function YouTubeChannelListDetailPage({
  params,
}: {
  params: { listId: string };
}) {
  return <ChannelListDetail listId={params.listId} />;
}

