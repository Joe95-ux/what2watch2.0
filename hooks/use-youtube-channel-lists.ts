"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getPusherClient, isPusherClientConfigured } from "@/lib/pusher/client";
import {
  getYouTubeChannelListChannelName,
  getYouTubeChannelListsGlobalChannelName,
  PUSHER_EVENTS,
} from "@/lib/pusher/channels";
import { useYouTubeListAnalyticsRealtime } from "@/hooks/use-youtube-list-analytics";

export interface YouTubeChannelListItem {
  id: string;
  listId: string;
  channelId: string;
  channelTitle: string | null;
  channelThumbnail: string | null;
  channelDescription: string | null;
  subscriberCount: string | null;
  videoCount: string | null;
  channelUrl: string | null;
  notes: string | null;
  /** AI-extracted from curator notes; used for keyword filter on list detail */
  keywords?: string[];
  position: number;
  createdAt: string;
}

export interface YouTubeChannelList {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  tags: string[];
  followersCount: number;
  viewsCount?: number;
  items: YouTubeChannelListItem[];
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  _count: {
    items: number;
    followedBy: number;
  };
  viewerState: {
    isOwner: boolean;
    isFollowing: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

type ChannelListScope = "public" | "mine" | "following";

export interface ChannelListItemPayload {
  channelId: string;
  channelTitle?: string | null;
  channelThumbnail?: string | null;
  channelDescription?: string | null;
  subscriberCount?: string | null;
  videoCount?: string | null;
  channelUrl?: string | null;
  notes?: string | null;
  position?: number;
}

interface CreateChannelListPayload {
  name: string;
  description?: string | null;
  isPublic?: boolean;
  tags?: string[];
  coverImage?: string | null;
  channels: ChannelListItemPayload[];
}

interface UpdateChannelListPayload extends Partial<CreateChannelListPayload> {
  listId: string;
}

async function fetchChannelLists(scope: ChannelListScope = "public") {
  const params = new URLSearchParams();
  params.set("scope", scope);
  const response = await fetch(`/api/youtube/channel-lists?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch lists" }));
    throw new Error(error.error || "Failed to fetch channel lists");
  }
  const data = await response.json();
  return (data.lists || []) as YouTubeChannelList[];
}

async function fetchChannelList(listId: string) {
  const response = await fetch(`/api/youtube/channel-lists/${listId}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch list" }));
    throw new Error(error.error || "Failed to fetch channel list");
  }
  const data = await response.json();
  return data.list as YouTubeChannelList;
}

async function createChannelList(payload: CreateChannelListPayload) {
  const response = await fetch("/api/youtube/channel-lists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to create list" }));
    throw new Error(error.error || "Failed to create channel list");
  }
  const data = await response.json();
  return data.list as YouTubeChannelList;
}

async function updateChannelList(payload: UpdateChannelListPayload) {
  const { listId, ...rest } = payload;
  const response = await fetch(`/api/youtube/channel-lists/${listId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rest),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to update list" }));
    throw new Error(error.error || "Failed to update channel list");
  }
  const data = await response.json();
  return data.list as YouTubeChannelList;
}

async function deleteChannelList(listId: string) {
  const response = await fetch(`/api/youtube/channel-lists/${listId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to delete list" }));
    throw new Error(error.error || "Failed to delete channel list");
  }
}

async function toggleFollowChannelList(listId: string) {
  const response = await fetch(`/api/youtube/channel-lists/${listId}/follow`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to update follow" }));
    throw new Error(error.error || "Failed to update follow status");
  }
  const data = await response.json();
  return data.isFollowing as boolean;
}

export function useYouTubeChannelLists(scope: ChannelListScope = "public") {
  const queryClient = useQueryClient();
  useYouTubeListAnalyticsRealtime();

  useEffect(() => {
    if (!isPusherClientConfigured()) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const globalChannel = pusher.subscribe(getYouTubeChannelListsGlobalChannelName());
    const handleGlobalUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists"] });
    };
    globalChannel.bind(PUSHER_EVENTS.YOUTUBE_CHANNEL_LIST_UPDATED, handleGlobalUpdate);

    return () => {
      globalChannel.unbind(
        PUSHER_EVENTS.YOUTUBE_CHANNEL_LIST_UPDATED,
        handleGlobalUpdate
      );
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["youtube-channel-lists", scope],
    queryFn: () => fetchChannelLists(scope),
    staleTime: 1000 * 60 * 5,
  });
}

export function useYouTubeChannelList(listId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!listId || !isPusherClientConfigured()) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(getYouTubeChannelListChannelName(listId));
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-list", listId] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists"] });
    };
    channel.bind(PUSHER_EVENTS.YOUTUBE_CHANNEL_LIST_UPDATED, handleUpdate);

    return () => {
      channel.unbind(PUSHER_EVENTS.YOUTUBE_CHANNEL_LIST_UPDATED, handleUpdate);
    };
  }, [listId, queryClient]);

  return useQuery({
    queryKey: ["youtube-channel-list", listId],
    queryFn: () => fetchChannelList(listId!),
    enabled: Boolean(listId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateYouTubeChannelList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChannelList,
    onSuccess: (list) => {
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-list", list.id] });
    },
  });
}

export function useUpdateYouTubeChannelList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateChannelList,
    onSuccess: (list) => {
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-list", list.id] });
      // Invalidate channel list channels query to refresh the channels grid
      queryClient.invalidateQueries({ queryKey: ["channel-list-channels", list.id] });
    },
  });
}

export function useDeleteYouTubeChannelList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteChannelList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists", "mine"] });
    },
  });
}

export function useToggleYouTubeChannelListFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleFollowChannelList,
    onSuccess: (_isFollowing, variables) => {
      const listId = variables as string;
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-list", listId] });
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-lists", "following"] });
    },
  });
}

