"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ForumPostList } from "./forum-post-list";
import { CreatePostDialog } from "./create-post-dialog";
import { RecentPosts } from "./recent-posts";
import { useUser } from "@clerk/nextjs";

export function PopularPostsPageClient() {
  const { isSignedIn } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Column */}
          <div className="flex-1 min-w-0">
            {/* Header with Create Post Button */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Popular Posts</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Most upvoted posts in the forum
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

            {/* Post List - Sorted by Popular */}
            <ForumPostList 
              defaultSortBy="score"
              defaultOrder="desc"
            />
          </div>

          {/* Right Sidebar - Sticky */}
          <aside className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-[85px] self-start">
            <div className="space-y-4">
              {/* Recent Posts */}
              <RecentPosts limit={5} />
            </div>
          </aside>
        </div>
      </div>

      {/* Create Post Dialog */}
      {isSignedIn && (
        <CreatePostDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
        />
      )}
    </>
  );
}

