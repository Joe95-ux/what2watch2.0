"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useYouTubeSearch } from "@/hooks/use-youtube-search";
import YouTubeVideoCard from "@/components/youtube/youtube-video-card";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeVideo } from "@/hooks/use-youtube-channel";

export function YouTubeSearch() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isFetching } = useYouTubeSearch(searchQuery, searchQuery.length > 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 0) {
      setSearchQuery(query.trim());
    }
  };

  const videos: YouTubeVideo[] = data?.videos || [];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search YouTube videos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={isFetching || query.trim().length === 0}>
          {isFetching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            "Search"
          )}
        </Button>
      </form>

      {searchQuery && (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No videos found for &quot;{searchQuery}&quot;
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Found {data?.totalResults || 0} results for &quot;{searchQuery}&quot;
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.map((video) => (
                  <YouTubeVideoCard key={video.id} video={video} channelId={video.channelId} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

