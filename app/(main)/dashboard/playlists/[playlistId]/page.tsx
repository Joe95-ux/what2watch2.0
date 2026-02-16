import PlaylistDetailContent from "@/components/playlists/playlist-detail-content";

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = await params;
  return <PlaylistDetailContent playlistId={playlistId} />;
}
