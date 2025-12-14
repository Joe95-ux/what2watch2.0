"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, PanelLeft } from "lucide-react";
import { ForumPostList } from "./forum-post-list";
import { CreatePostDialog } from "./create-post-dialog";
import { ForumSidebar } from "./forum-sidebar";
import { PopularTopics } from "./popular-topics";
import { useUser } from "@clerk/nextjs";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import Footer from "@/components/footer";
import { cn } from "@/lib/utils";

export function ForumPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useUser();
  const isMobile = useIsMobile();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const tmdbId = searchParams.get("tmdbId");
  const mediaType = searchParams.get("mediaType");

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <ForumSidebar 
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      {/* Main Content */}
      <div className={cn(
        "flex-1 min-w-0 transition-all duration-300 flex flex-col overflow-hidden",
        !isMobile && "ml-64"
      )}>
        {/* Mobile Sidebar Trigger */}
        {isMobile && (
          <div className="sticky top-[65px] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
            <div className="px-4 py-2 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="cursor-pointer h-9 w-9"
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
              <div className="h-4 w-px bg-border flex-shrink-0" />
              <h1 className="text-sm font-semibold">Forum</h1>
            </div>
          </div>
        )}

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Two Column Layout */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main Content Column */}
              <div className="flex-1 min-w-0">
                {/* Header with Create Post Button */}
                <div className="flex items-center justify-between mb-6">
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

                {/* Post List */}
                <ForumPostList />
              </div>

              {/* Right Sidebar */}
              <aside className="w-full lg:w-80 flex-shrink-0">
                <div className="sticky top-24">
                  <PopularTopics />
                </div>
              </aside>
            </div>
          </div>

          {/* Footer inside content area */}
          <Footer />
        </ScrollArea>

        {/* Create Post Dialog */}
        {isSignedIn && (
          <CreatePostDialog
            isOpen={isCreateDialogOpen}
            onClose={() => setIsCreateDialogOpen(false)}
            tmdbId={tmdbId ? parseInt(tmdbId, 10) : undefined}
            mediaType={mediaType as "movie" | "tv" | undefined}
          />
        )}
      </div>
    </div>
  );
}

