import PublicPlaylistContent from "@/components/playlists/public-playlist-content";

interface PageProps {
  params: Promise<{ playlistId: string }>;
}

export default async function PublicPlaylistPage({ params }: PageProps) {
  const { playlistId } = await params;
  return <PublicPlaylistContent playlistId={playlistId} />;
}

