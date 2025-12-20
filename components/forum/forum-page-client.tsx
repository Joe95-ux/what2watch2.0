"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ForumPostList } from "./forum-post-list";
import { CreatePostDialog } from "./create-post-dialog";
import { PopularPosts } from "./popular-topics";
import { ForumSearchWithAutocomplete } from "./forum-search-with-autocomplete";
import { useUser } from "@clerk/nextjs";

export function ForumPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const tmdbId = searchParams.get("tmdbId");
  const mediaType = searchParams.get("mediaType");
  const currentSearch = searchParams.get("search") || "";

  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    router.replace(`/forum?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Column */}
          <div className="flex-1 min-w-0">
            {/* Header with Search and Create Post Button */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Forum</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Discuss movies, TV shows, and more with the community
                  </p>
                </div>
                {isSignedIn && (
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="cursor-pointer"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Post
                  </Button>
                )}
              </div>
              
              {/* Search Bar */}
              <ForumSearchWithAutocomplete
                value={currentSearch}
                onChange={handleSearchChange}
                placeholder="Search posts, tags, categories..."
              />
            </div>

            {/* Post List */}
            <ForumPostList />
          </div>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-[85px] self-start">
            <div className="">
              <PopularPosts />
            </div>
          </aside>
        </div>
      </div>

      {/* Create Post Dialog */}
      {isSignedIn && (
        <CreatePostDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          tmdbId={tmdbId ? parseInt(tmdbId, 10) : undefined}
          mediaType={mediaType as "movie" | "tv" | undefined}
        />
      )}
    </>
  );
}

