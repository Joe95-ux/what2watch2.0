import { YouTubeSearch } from "@/components/youtube/youtube-search";

export const metadata = {
  title: "Search YouTube | what2watch",
  description: "Search for YouTube videos",
};

export default function YouTubeSearchPage() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Search YouTube</h1>
        <p className="text-muted-foreground">
          Search for videos across YouTube
        </p>
      </div>
      <YouTubeSearch />
    </div>
  );
}

