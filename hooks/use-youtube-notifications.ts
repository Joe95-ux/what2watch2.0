import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface YouTubeNotification {
  id: string;
  userId: string;
  channelId: string;
  channelTitle?: string | null;
  channelThumbnail?: string | null;
  videoId: string;
  videoTitle: string;
  videoThumbnail?: string | null;
  videoUrl: string;
  publishedAt: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: YouTubeNotification[];
  unreadCount: number;
}

async function fetchNotifications(unreadOnly = false): Promise<NotificationsResponse> {
  const response = await fetch(`/api/youtube/notifications?unreadOnly=${unreadOnly}`);
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
  const response = await fetch("/api/youtube/notifications", {
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

export function useYouTubeNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["youtube-notifications", unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}

export function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-notifications"] });
    },
  });
}

