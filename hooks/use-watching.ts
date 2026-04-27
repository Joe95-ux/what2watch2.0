import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  WatchingDashboardResponse,
  WatchingSessionDTO,
  WatchingTitlePresenceResponse,
  WatchingVisibility,
} from "@/lib/watching-types";
import { getPusherClient } from "@/lib/pusher/client";
import {
  getWatchingDashboardChannelName,
  getWatchingTitleChannelName,
  PUSHER_EVENTS,
} from "@/lib/pusher/channels";

type WatchingActionBody =
  | {
      action: "start";
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      posterPath?: string | null;
      backdropPath?: string | null;
      seasonNumber?: number | null;
      episodeNumber?: number | null;
      progressPercent?: number;
      visibility?: WatchingVisibility;
    }
  | {
      action: "update_progress";
      sessionId: string;
      progressPercent: number;
    }
  | {
      action: "finish" | "stop";
      sessionId: string;
      thought?: string;
      spoiler?: boolean;
    }
  | {
      action: "resume";
      sessionId: string;
    }
  | {
      action: "share_thought";
      sessionId: string;
      content: string;
      spoiler?: boolean;
    };

async function fetchWatchingDashboard(): Promise<WatchingDashboardResponse> {
  const res = await fetch("/api/watching");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch watching dashboard");
  }
  return res.json();
}

async function fetchWatchingForTitle(tmdbId: number, mediaType: "movie" | "tv"): Promise<WatchingTitlePresenceResponse> {
  const params = new URLSearchParams({
    tmdbId: String(tmdbId),
    mediaType,
  });
  const res = await fetch(`/api/watching?${params.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch title watching presence");
  }
  return res.json();
}

async function mutateWatching(action: WatchingActionBody): Promise<{ session?: WatchingSessionDTO; success?: boolean }> {
  const res = await fetch("/api/watching", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update watching status");
  }
  return res.json();
}

type WatchingThoughtReply = {
  id: string;
  thoughtId: string;
  userId: string;
  parentReplyId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

type UpdateThoughtPayload = {
  thoughtId: string;
  content: string;
};

type DeleteThoughtPayload = {
  thoughtId: string;
};

type UpdateReplyPayload = {
  thoughtId: string;
  replyId: string;
  content: string;
};

type DeleteReplyPayload = {
  thoughtId: string;
  replyId: string;
};

async function fetchThoughtReplies(thoughtId: string): Promise<WatchingThoughtReply[]> {
  const res = await fetch(`/api/watching/thoughts/${thoughtId}/replies`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch replies");
  }
  const data = await res.json();
  return data.replies || [];
}

async function addThoughtReply({
  thoughtId,
  content,
  parentReplyId,
}: {
  thoughtId: string;
  content: string;
  parentReplyId?: string | null;
}): Promise<WatchingThoughtReply> {
  const res = await fetch(`/api/watching/thoughts/${thoughtId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, parentReplyId: parentReplyId ?? null }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to add reply");
  }
  const data = await res.json();
  return data.reply;
}

async function addThoughtReaction({
  thoughtId,
  reactionType,
}: {
  thoughtId: string;
  reactionType: string;
}): Promise<void> {
  const res = await fetch(`/api/watching/thoughts/${thoughtId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reactionType }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to add reaction");
  }
}

async function updateThought({ thoughtId, content }: UpdateThoughtPayload): Promise<void> {
  const res = await fetch(`/api/watching/thoughts/${thoughtId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update thought");
  }
}

async function deleteThought({ thoughtId }: DeleteThoughtPayload): Promise<void> {
  const res = await fetch(`/api/watching/thoughts/${thoughtId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete thought");
  }
}

async function updateThoughtReply({ thoughtId, replyId, content }: UpdateReplyPayload): Promise<void> {
  const res = await fetch(`/api/watching/thoughts/${thoughtId}/replies/${replyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update reply");
  }
}

async function deleteThoughtReply({ thoughtId, replyId }: DeleteReplyPayload): Promise<void> {
  const res = await fetch(`/api/watching/thoughts/${thoughtId}/replies/${replyId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete reply");
  }
}

async function removeThoughtReaction({
  thoughtId,
  reactionType,
}: {
  thoughtId: string;
  reactionType: string;
}): Promise<void> {
  const res = await fetch(
    `/api/watching/thoughts/${thoughtId}/reactions?reactionType=${encodeURIComponent(reactionType)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to remove reaction");
  }
}

export function useWatchingDashboard(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = getWatchingDashboardChannelName();
    const channel = pusher.subscribe(channelName);
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
    };

    channel.bind(PUSHER_EVENTS.WATCHING_DASHBOARD_UPDATED, handleUpdate);
    return () => {
      channel.unbind(PUSHER_EVENTS.WATCHING_DASHBOARD_UPDATED, handleUpdate);
      pusher.unsubscribe(channelName);
    };
  }, [enabled, queryClient]);

  return useQuery({
    queryKey: ["watching-dashboard"],
    queryFn: fetchWatchingDashboard,
    staleTime: 30 * 1000,
    enabled,
  });
}

export function useWatchingForTitle(tmdbId: number, mediaType: "movie" | "tv", enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || tmdbId <= 0) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = getWatchingTitleChannelName(mediaType, tmdbId);
    const channel = pusher.subscribe(channelName);
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["watching-title", tmdbId, mediaType] });
      queryClient.invalidateQueries({ queryKey: ["watching-thought-replies"] });
    };

    channel.bind(PUSHER_EVENTS.WATCHING_TITLE_UPDATED, handleUpdate);
    return () => {
      channel.unbind(PUSHER_EVENTS.WATCHING_TITLE_UPDATED, handleUpdate);
      pusher.unsubscribe(channelName);
    };
  }, [enabled, mediaType, queryClient, tmdbId]);

  return useQuery({
    queryKey: ["watching-title", tmdbId, mediaType],
    queryFn: () => fetchWatchingForTitle(tmdbId, mediaType),
    staleTime: 30 * 1000,
    enabled: enabled && tmdbId > 0,
  });
}

export function useWatchingThoughtReplies(thoughtId: string, enabled = true) {
  return useQuery({
    queryKey: ["watching-thought-replies", thoughtId],
    queryFn: () => fetchThoughtReplies(thoughtId),
    enabled: enabled && !!thoughtId,
    staleTime: 20 * 1000,
  });
}

export function useAddWatchingThoughtReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addThoughtReply,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watching-thought-replies", variables.thoughtId] });
      queryClient.invalidateQueries({ queryKey: ["watching-title"] });
    },
  });
}

export function useWatchingThoughtReaction() {
  const queryClient = useQueryClient();
  const addMutation = useMutation({
    mutationFn: addThoughtReaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watching-title"] });
    },
  });
  const removeMutation = useMutation({
    mutationFn: removeThoughtReaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watching-title"] });
    },
  });
  return { addMutation, removeMutation };
}

export function useUpdateWatchingThought() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateThought,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["watching-title"] });
      queryClient.invalidateQueries({ queryKey: ["watching-thought-replies"] });
    },
  });
}

export function useDeleteWatchingThought() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteThought,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["watching-title"] });
      queryClient.invalidateQueries({ queryKey: ["watching-thought-replies"] });
    },
  });
}

export function useUpdateWatchingThoughtReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateThoughtReply,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watching-thought-replies", variables.thoughtId] });
      queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["watching-title"] });
    },
  });
}

export function useDeleteWatchingThoughtReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteThoughtReply,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watching-thought-replies", variables.thoughtId] });
      queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["watching-title"] });
    },
  });
}

export function useWatchingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mutateWatching,
    onMutate: async (action) => {
      if (action.action !== "update_progress" && action.action !== "finish") return;
      await queryClient.cancelQueries({ queryKey: ["watching-dashboard"] });
      const previous = queryClient.getQueryData<WatchingDashboardResponse>(["watching-dashboard"]);
      if (!previous) return { previous };

      const next =
        action.action === "update_progress"
          ? {
              ...previous,
              currentSession:
                previous.currentSession?.id === action.sessionId
                  ? { ...previous.currentSession, progressPercent: action.progressPercent }
                  : previous.currentSession,
              watchingNow: previous.watchingNow.map((session) =>
                session.id === action.sessionId ? { ...session, progressPercent: action.progressPercent } : session
              ),
            }
          : (() => {
              const nowIso = new Date().toISOString();
              let finishedSession = previous.watchingNow.find((session) => session.id === action.sessionId) ?? null;
              if (!finishedSession && previous.currentSession?.id === action.sessionId) {
                finishedSession = previous.currentSession;
              }
              const normalizedFinished = finishedSession
                ? {
                    ...finishedSession,
                    status: "JUST_FINISHED" as const,
                    progressPercent: 100,
                    endedAt: nowIso,
                    updatedAt: nowIso,
                  }
                : null;
              return {
                ...previous,
                currentSession: previous.currentSession?.id === action.sessionId ? null : previous.currentSession,
                watchingNow: previous.watchingNow.filter((session) => session.id !== action.sessionId),
                justFinished: normalizedFinished
                  ? [normalizedFinished, ...previous.justFinished.filter((session) => session.id !== action.sessionId)]
                  : previous.justFinished,
              };
            })();
      queryClient.setQueryData(["watching-dashboard"], next);
      return { previous };
    },
    onError: (_error, action, context) => {
      if (action.action !== "update_progress" && action.action !== "finish") return;
      if (context?.previous) {
        queryClient.setQueryData(["watching-dashboard"], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watching-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["watching-title"] });
    },
  });
}

