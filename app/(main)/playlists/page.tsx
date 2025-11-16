import { redirect } from "next/navigation";

export default async function PlaylistsPage() {
  // Redirect to dashboard version
  redirect("/dashboard/playlists");
}

