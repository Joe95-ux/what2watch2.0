"use client";

import { useState } from "react";
import { List, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClerk, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { ChannelListCard } from "./channel-list-card";
import { ChannelListBuilder } from "./channel-list-builder";
import { useYouTubeChannelLists, YouTubeChannelList } from "@/hooks/use-youtube-channel-lists";
import { useYouTubeChannels } from "@/hooks/use-youtube-channels";
import { useIsMobile } from "@/hooks/use-mobile";

function ChannelListCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/70 p-4">
      {/* Stacked Channel Avatars Skeleton */}
      <div className="relative h-12 flex items-center">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full -ml-5" />
        <Skeleton className="h-10 w-10 rounded-full -ml-5" />
        <Skeleton className="h-10 w-10 rounded-full -ml-5" />
      </div>
      {/* List Title Skeleton */}
      <Skeleton className="h-6 w-3/4" />
      {/* Creator Skeleton */}
      <Skeleton className="h-4 w-1/2" />
      {/* Description Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

const SCOPES = [
  { value: "public", label: "Trending" },
  { value: "following", label: "Following" },
  { value: "mine", label: "My lists" },
] as const;

type ScopeValue = (typeof SCOPES)[number]["value"];

export function ChannelListsExplorer() {
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const isMobile = useIsMobile();
  const [scope, setScope] = useState<ScopeValue>("public");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingList, setEditingList] = useState<YouTubeChannelList | null>(null);
  const { data: lists = [], isLoading, refetch } = useYouTubeChannelLists(scope);
  const { data: availableChannels = [], isLoading: isLoadingChannels } = useYouTubeChannels();

  const handleCreateClick = () => {
    if (!isSignedIn) {
      toast("Sign in to curate lists");
      openSignIn?.({
        afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });
      return;
    }
    setEditingList(null);
    setBuilderOpen(true);
  };

  const handleBuilderCompleted = () => {
    setBuilderOpen(false);
    refetch();
  };

  return (
    <div className="w-full max-w-[90rem] mx-auto py-8 px-4 sm:px-0">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Curated Channel lists</h1>
        {!isMobile && (
          <Button onClick={handleCreateClick} className="gap-2 cursor-pointer">
            <PlusCircle className="h-4 w-4" />
            Create list
          </Button>
        )}
      </div>

      <Tabs value={scope} onValueChange={(value) => setScope(value as ScopeValue)}>
        {isMobile ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select value={scope} onValueChange={(value) => setScope(value as ScopeValue)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {SCOPES.find((s) => s.value === scope)?.label || "Trending"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateClick} className="gap-2 cursor-pointer flex-shrink-0">
              <PlusCircle className="h-4 w-4" />
              Create list
            </Button>
          </div>
        ) : (
          <TabsList>
            {SCOPES.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="px-6 cursor-pointer">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
        {SCOPES.map((item) => (
          <TabsContent key={item.value} value={item.value} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <ChannelListCardSkeleton key={index} />
                ))}
              </div>
            ) : lists.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center">
                <List className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No lists yet</h3>
                <p className="text-sm text-muted-foreground">
                  {item.value === "mine"
                    ? "You haven't published a list yet."
                    : item.value === "following"
                      ? "You're not following any channel lists yet."
                      : "Be the first to share your curated list."}
                </p>
                <Button onClick={handleCreateClick} className="mt-4 cursor-pointer">
                  Start a list
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {lists.map((list) => (
                  <ChannelListCard key={list.id} list={list} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ChannelListBuilder
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        initialData={editingList}
        availableChannels={availableChannels}
        onCompleted={handleBuilderCompleted}
      />

      {isLoadingChannels && builderOpen && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Loading your channel roster…
        </p>
      )}
    </div>
  );
}

