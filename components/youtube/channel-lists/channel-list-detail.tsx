"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { Share2, Pencil, Trash2, ArrowLeft, UsersRound, Facebook, Twitter, Mail, Link2, Eye, Loader2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useDeleteYouTubeChannelList,
  useToggleYouTubeChannelListFollow,
  useYouTubeChannelList,
  YouTubeChannelList,
  YouTubeChannelListItem,
} from "@/hooks/use-youtube-channel-lists";
import { useYouTubeChannels } from "@/hooks/use-youtube-channels";
import { ChannelListBuilder } from "./channel-list-builder";
import { ChannelListChannelsToolbar } from "./channel-list-channels-toolbar";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { YouTubeChannelCardPage, YouTubeChannelCardPageSkeleton } from "../youtube-channel-card-page";
import { YouTubeChannelCardHorizontal, YouTubeChannelCardHorizontalSkeleton } from "../youtube-channel-card-horizontal";
import { useYouTubeCardStyle } from "@/hooks/use-youtube-card-style";
import { useUser } from "@clerk/nextjs";
import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChannelListDetailProps {
  listId: string;
}

const CHANNELS_PAGE_SIZE = 32;

interface ChannelData {
  id: string;
  channelId: string;
  slug?: string | null;
  title: string | null;
  thumbnail: string | null;
  channelUrl: string | null;
  categories: string[];
  rating: {
    average: number;
    count: number;
  } | null;
  subscriberCount: string;
  videoCount: string;
  note?: string | null;
  inUserPool?: boolean;
}

// Component to fetch and display channels with categories and ratings (infinite scroll: 32 at a time)
function ChannelListChannelsGrid({ items, listId }: { items: YouTubeChannelListItem[]; listId: string }) {
  const { data: cardStyle } = useYouTubeCardStyle();
  const effectiveCardStyle = cardStyle || "centered";
  const channelIds = items.map((item) => item.channelId);
  const itemsKey = channelIds.join(",");
  const [visibleCount, setVisibleCount] = useState(CHANNELS_PAGE_SIZE);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(CHANNELS_PAGE_SIZE);
  }, [itemsKey, listId]);

  // Create a map of channelId to position to preserve order
  const positionMap = new Map(
    items.map((item) => [item.channelId, item.position])
  );

  // Fetch channel data with categories and ratings
  const { data: channelsData, isLoading } = useQuery<{ channels: ChannelData[] }>({
    queryKey: ["channel-list-channels", listId, channelIds.join(",")],
    queryFn: async () => {
      if (channelIds.length === 0) return { channels: [] };

      // Fetch only channels in this list so inUserPool and metadata are accurate.
      const params = new URLSearchParams({
        channelIds: channelIds.join(","),
      });
      const response = await fetch(`/api/youtube/channels/all?${params}`);
      if (!response.ok) throw new Error("Failed to fetch channels");
      const data = await response.json() as {
        channels: Array<{
          id: string;
          channelId: string;
          slug?: string | null;
          title: string | null;
          thumbnail: string | null;
          channelUrl: string | null;
          categories: string[];
          rating: {
            average: number;
            count: number;
          } | null;
          subscriberCount?: string;
          videoCount?: string;
          inUserPool?: boolean;
        }>;
      };

      // Filter to only channels in this list and map to the expected format
      const channelMap = new Map(
        items.map((item) => [item.channelId, item])
      );

      const channels: ChannelData[] = (data.channels || [])
        .filter((ch) => channelMap.has(ch.channelId))
        .map((ch) => {
          const listItem = channelMap.get(ch.channelId);
          return {
            id: listItem?.id || ch.id,
            channelId: ch.channelId,
            slug: ch.slug || null,
            title: ch.title || listItem?.channelTitle || null,
            thumbnail: ch.thumbnail || listItem?.channelThumbnail || null,
            channelUrl: ch.channelUrl || listItem?.channelUrl || null,
            categories: ch.categories || [],
            rating: ch.rating || null,
            subscriberCount: ch.subscriberCount || listItem?.subscriberCount || "0",
            videoCount: ch.videoCount || listItem?.videoCount || "0",
            note: listItem?.notes || null,
            inUserPool: ch.inUserPool ?? false,
          };
        });

      // For channels not found in the API response, use the list item data
      const foundChannelIds = new Set(channels.map((ch) => ch.channelId));
      items.forEach((item) => {
        if (!foundChannelIds.has(item.channelId)) {
          channels.push({
            id: item.id,
            channelId: item.channelId,
            slug: null,
            title: item.channelTitle,
            thumbnail: item.channelThumbnail,
            channelUrl: item.channelUrl,
            categories: [],
            rating: null,
            subscriberCount: item.subscriberCount || "0",
            videoCount: item.videoCount || "0",
            note: item.notes || null,
            inUserPool: false, // Default to false for channels not in API response
          });
        }
      });

      // Sort channels by position to preserve order from the list
      channels.sort((a, b) => {
        const posA = positionMap.get(a.channelId) ?? Infinity;
        const posB = positionMap.get(b.channelId) ?? Infinity;
        return posA - posB;
      });

      return { channels };
    },
    enabled: channelIds.length > 0,
    staleTime: 0, // Always refetch when query key changes (e.g., when list is updated)
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((_, index) => 
          effectiveCardStyle === "horizontal" ? (
            <YouTubeChannelCardHorizontalSkeleton key={index} />
          ) : (
            <YouTubeChannelCardPageSkeleton key={index} />
          )
        )}
      </div>
    );
  }

  const channels = channelsData?.channels || [];
  const visibleChannels = useMemo(
    () => channels.slice(0, visibleCount),
    [channels, visibleCount]
  );

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || channels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        setVisibleCount((c) => {
          if (c >= channels.length) return c;
          return Math.min(c + CHANNELS_PAGE_SIZE, channels.length);
        });
      },
      { root: null, rootMargin: "320px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [channels.length, itemsKey]);

  if (channels.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="text-muted-foreground">
          {items.length === 0
            ? "No channels in this list."
            : "Could not load channel details for this list."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleChannels.map((channel: ChannelData) =>
          effectiveCardStyle === "horizontal" ? (
            <YouTubeChannelCardHorizontal key={channel.id} channel={channel} />
          ) : (
            <YouTubeChannelCardPage key={channel.id} channel={channel} />
          )
        )}
      </div>
      {visibleCount < channels.length ? (
        <div
          ref={loadMoreSentinelRef}
          className="h-8 w-full shrink-0"
          aria-hidden
        />
      ) : null}
    </>
  );
}

export function ChannelListDetail({ listId }: ChannelListDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [channelSearch, setChannelSearch] = useState("");
  const [keywordFilter, setKeywordFilter] = useState<string>("all");
  const { data: list, isLoading, refetch } = useYouTubeChannelList(listId);
  const { data: availableChannels = [] } = useYouTubeChannels();
  const deleteList = useDeleteYouTubeChannelList();
  const toggleFollow = useToggleYouTubeChannelListFollow();
  const [hasLoggedVisit, setHasLoggedVisit] = useState(false);

  const { data: cardStyle } = useYouTubeCardStyle();
  const effectiveCardStyle = cardStyle || "centered";

  const updateCardStyle = useMutation({
    mutationFn: async (nextStyle: "centered" | "horizontal") => {
      const response = await fetch("/api/user/view-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeCardStyle: nextStyle }),
      });
      if (!response.ok) {
        throw new Error("Failed to update card style");
      }
      return nextStyle;
    },
    onMutate: async (nextStyle) => {
      await queryClient.cancelQueries({ queryKey: ["youtube-card-style"] });
      const previousStyle = queryClient.getQueryData<"centered" | "horizontal">([
        "youtube-card-style",
      ]);
      queryClient.setQueryData(["youtube-card-style"], nextStyle);
      return { previousStyle };
    },
    onError: (_error, _nextStyle, context) => {
      if (context?.previousStyle) {
        queryClient.setQueryData(["youtube-card-style"], context.previousStyle);
      }
      toast.error("Failed to update card style");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-card-style"] });
    },
  });

  const keywordOptions = useMemo(() => {
    if (!list?.items?.length) return [];
    const set = new Set<string>();
    for (const item of list.items) {
      for (const k of item.keywords ?? []) {
        const t = k.trim();
        if (t) set.add(t);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [list?.items]);

  const filteredListItems = useMemo(() => {
    if (!list?.items?.length) return [];
    let next = list.items;
    if (keywordFilter !== "all") {
      next = next.filter((item) =>
        (item.keywords ?? []).some((k) => k.trim() === keywordFilter)
      );
    }
    const q = channelSearch.trim().toLowerCase();
    if (q) {
      next = next.filter((item) => {
        const title = (item.channelTitle ?? "").toLowerCase();
        const notes = (item.notes ?? "").toLowerCase();
        const kw = (item.keywords ?? []).join(" ").toLowerCase();
        return title.includes(q) || notes.includes(q) || kw.includes(q);
      });
    }
    return next;
  }, [list?.items, keywordFilter, channelSearch]);

  useEffect(() => {
    if (keywordFilter !== "all" && !keywordOptions.includes(keywordFilter)) {
      setKeywordFilter("all");
    }
  }, [keywordFilter, keywordOptions]);

  // Track visit event when viewing a YouTube list
  useEffect(() => {
    if (!list || hasLoggedVisit || list.viewerState.isOwner) {
      return;
    }

    const controller = new AbortController();

    const logVisit = async () => {
      try {
        await fetch("/api/analytics/youtube-list-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listId: list.id,
            type: "VISIT",
            source: "youtube_list_view",
          }),
          signal: controller.signal,
        });
        setHasLoggedVisit(true);
      } catch (logError) {
        if ((logError as Error).name !== "AbortError") {
          console.error("Failed to log YouTube list visit", logError);
        }
      }
    };

    logVisit();

    return () => controller.abort();
  }, [list, hasLoggedVisit]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="-mt-[65px] border-b border-white/10 bg-zinc-950 text-zinc-50 dark:bg-black pt-20 sm:pt-34 pb-6 sm:pb-8">
          <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8">
            <Skeleton className="h-9 w-28 mb-5 rounded-md bg-zinc-800/50" />
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1 space-y-4">
                <Skeleton className="h-4 w-28 mb-2 rounded-md bg-zinc-800/50" />
                <Skeleton className="h-10 w-3/4 max-w-md rounded-md bg-zinc-800/50" />
                <Skeleton className="h-5 w-full max-w-lg rounded-md bg-zinc-800/50" />
                <div className="flex flex-wrap gap-3">
                  <Skeleton className="h-4 w-40 rounded-md bg-zinc-800/50" />
                </div>
              </div>
              <div className="hidden md:block w-px min-h-[120px] bg-white/10 mx-2" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-24 rounded-md bg-zinc-800/50" />
                <Skeleton className="h-10 w-20 rounded-md bg-zinc-800/50" />
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <YouTubeChannelCardPageSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-2xl font-bold">Channel list not found</h1>
          <p className="text-muted-foreground">It may have been removed or set to private.</p>
          <Button onClick={() => router.push("/youtube-channel/lists")} className="mt-6 cursor-pointer">
            Back to lists
          </Button>
        </div>
      </div>
    );
  }

  const handleFollowToggle = async () => {
    if (!isSignedIn) {
      toast.info("Sign in to follow channel lists.");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
      return;
    }
    try {
      await toggleFollow.mutateAsync(list.id);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update follow. Please try again later.");
    }
  };

  const handleOpenDeleteDialog = () => {
    setDeleteConfirmName("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeleteConfirmName("");
    }
  };

  const handleConfirmDelete = async () => {
    if (!list || deleteConfirmName !== list.name) return;
    try {
      await deleteList.mutateAsync(list.id);
      toast.success("List deleted");
      setDeleteDialogOpen(false);
      setDeleteConfirmName("");
      router.push("/youtube-channel/lists");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete list. Please try again.");
    }
  };

  const ownerName = list.user?.username || list.user?.displayName || "Curator";
  const ownerProfileHref = `/user/${list.user?.username || list.user?.id}`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleSocialShare = async (platform: "facebook" | "twitter" | "whatsapp" | "email" | "link") => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(list.name);
    const encodedDescription = encodeURIComponent(list.description || "");

    // Track share event
    try {
      await fetch("/api/analytics/youtube-list-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: list.id,
          type: "SHARE",
          source: platform,
        }),
      });
    } catch (error) {
      console.error("Failed to log share event", error);
    }

    if (platform === "link") {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
      return;
    }

    let shareUrl_platform = "";
    if (platform === "facebook") {
      shareUrl_platform = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else if (platform === "twitter") {
      shareUrl_platform = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${encodedDescription ? ` - ${encodedDescription}` : ""}`;
    } else if (platform === "whatsapp") {
      shareUrl_platform = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    } else if (platform === "email") {
      const subject = encodeURIComponent(list.name);
      const body = encodeURIComponent(`${list.description || ""}\n\n${shareUrl}`);
      shareUrl_platform = `mailto:?subject=${subject}&body=${body}`;
    }

    if (shareUrl_platform) {
      if (platform === "email") {
        window.location.href = shareUrl_platform;
      } else {
        window.open(shareUrl_platform, "_blank", "width=600,height=400");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="-mt-[65px] border-b border-white/10 bg-zinc-950 text-zinc-50 dark:bg-black pt-20 sm:pt-34 pb-6 sm:pb-8 lg:pb-10">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-3 sm:mb-5 -ml-2 h-9 text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1 space-y-4 min-w-0">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                  Channel list
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50 mt-1">
                  {list.name}
                </h1>
                {list.description ? (
                  <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-3xl">
                    {list.description}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                <Link
                  href={ownerProfileHref}
                  className="inline-flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
                >
                  <Avatar className="h-6 w-6 border border-white/10">
                    <AvatarImage src={list.user?.avatarUrl || undefined} alt={ownerName} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-200 text-xs">
                      {(ownerName || "C")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>Curated by {ownerName}</span>
                </Link>
                <span className="text-zinc-600">•</span>
                <span>{list._count.items} channels</span>
              </div>

              {list.tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {list.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="rounded-full border-white/20 text-zinc-300 bg-white/5"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="space-y-1">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                  List activity
                </span>
                <div className="text-sm text-zinc-300 flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-zinc-500" />
                    {list.viewsCount ?? 0} {list.viewsCount === 1 ? "view" : "views"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UsersRound className="h-4 w-4 text-zinc-500" />
                    {list.followersCount ?? list._count?.followedBy ?? 0}{" "}
                    {list.followersCount === 1 ? "follower" : "followers"}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:block w-px min-h-[140px] self-stretch bg-white/10 mx-2 shrink-0" />

            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap md:justify-end shrink-0">
              {list.viewerState.isOwner ? (
                <>
                  <Button
                    type="button"
                    className="gap-2 cursor-pointer bg-white/10 text-zinc-50 border border-white/10 hover:bg-white/15"
                    onClick={() => setBuilderOpen(true)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit list
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 cursor-pointer border-white/20 bg-transparent text-zinc-50 hover:bg-white/10 hover:text-white"
                    onClick={handleOpenDeleteDialog}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className={cn(
                    "gap-2 cursor-pointer",
                    list.viewerState.isFollowing
                      ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                      : "bg-zinc-100 text-zinc-950 hover:bg-white border-0"
                  )}
                  variant={list.viewerState.isFollowing ? "outline" : "default"}
                  onClick={handleFollowToggle}
                  disabled={toggleFollow.isPending || !isSignedIn}
                >
                  <UsersRound className="h-4 w-4" />
                  {list.viewerState.isFollowing ? "Following" : "Follow list"}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 cursor-pointer border-white/20 bg-transparent text-zinc-50 hover:bg-white/10 hover:text-white"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleSocialShare("facebook")}
                className="cursor-pointer"
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSocialShare("twitter")}
                className="cursor-pointer"
              >
                <Twitter className="h-4 w-4 mr-2" />
                X (Twitter)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSocialShare("whatsapp")}
                className="cursor-pointer"
              >
                <FaWhatsapp className="h-4 w-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSocialShare("email")}
                className="cursor-pointer"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSocialShare("link")}
                className="cursor-pointer"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col items-stretch sm:items-end sm:justify-end w-full">
          <ChannelListChannelsToolbar
            searchQuery={channelSearch}
            onSearchChange={setChannelSearch}
            keywordFilter={keywordFilter}
            onKeywordFilterChange={setKeywordFilter}
            keywordOptions={keywordOptions}
            effectiveCardStyle={effectiveCardStyle}
            onCardStyleChange={(style) => updateCardStyle.mutate(style)}
            isCardStylePending={updateCardStyle.isPending}
          />
        </div>

        {filteredListItems.length === 0 && list.items.length > 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">
              No channels match your search or keyword filter.
            </p>
          </div>
        ) : (
          <ChannelListChannelsGrid items={filteredListItems} listId={list.id} />
        )}
      </div>

      <ChannelListBuilder
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        initialData={list as YouTubeChannelList}
        availableChannels={availableChannels}
        onCompleted={() => {
          setBuilderOpen(false);
          refetch();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this channel list?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Type the exact list name below to confirm deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-list-name-confirm">List name</Label>
            <Input
              id="delete-list-name-confirm"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={list.name}
              autoComplete="off"
              disabled={deleteList.isPending}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Expected: <span className="font-mono font-medium text-foreground">{list.name}</span>
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteList.isPending} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="cursor-pointer"
              disabled={deleteConfirmName !== list.name || deleteList.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteList.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting…
                </>
              ) : (
                "Delete list"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

