import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ForumNotification {
  id: string;
  userId: string;
  type: "NEW_REPLY" | "REPLY_TO_REPLY" | "POST_MENTION" | "REPLY_MENTION";
  postId?: string | null;
  replyId?: string | null;
  actorId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  post?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  reply?: {
    id: string;
    content: string;
  } | null;
  actor?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  } | null;
}

interface NotificationsResponse {
  notifications: ForumNotification[];
  unreadCount: number;
}

async function fetchNotifications(unreadOnly = false): Promise<NotificationsResponse> {
  const response = await fetch(`/api/forum/notifications?unreadOnly=${unreadOnly}`);
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return response.json();
}

interface MarkAsReadParams {
  notificationIds?: string[];
  markAllAsRead?: boolean;
}

async function markNotificationsAsRead(params: MarkAsReadParams) {
  const { notificationIds, markAllAsRead = false } = params;
  const response = await fetch("/api/forum/notifications", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notificationIds, markAllAsRead }),
  });
  if (!response.ok) {
    throw new Error("Failed to mark notifications as read");
  }
  return response.json();
}

export function useForumNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["forum-notifications", unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}

export function useMarkForumNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-notifications"] });
    },
  });
}

interface DeleteNotificationsParams {
  notificationIds?: string[];
  deleteAll?: boolean;
}

async function deleteNotifications(params: DeleteNotificationsParams) {
  const { notificationIds, deleteAll = false } = params;
  const response = await fetch("/api/forum/notifications", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notificationIds, deleteAll }),
  });
  if (!response.ok) {
    throw new Error("Failed to delete notifications");
  }
  return response.json();
}

export function useDeleteForumNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-notifications"] });
    },
  });
}

