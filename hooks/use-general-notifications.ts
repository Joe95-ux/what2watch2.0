import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface GeneralNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message?: string | null;
  linkUrl?: string | null;
  metadata?: any;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: GeneralNotification[];
  unreadCount: number;
}

async function fetchNotifications(unreadOnly = false): Promise<NotificationsResponse> {
  const response = await fetch(`/api/general/notifications?unreadOnly=${unreadOnly}`);
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return response.json();
}

interface MarkAsReadParams {
  notificationIds?: string[];
  markAllAsRead?: boolean;
}

export function useGeneralNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["general-notifications", unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useMarkGeneralNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MarkAsReadParams) => {
      const response = await fetch("/api/general/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to mark as read" }));
        throw new Error(error.error || "Failed to mark as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["general-notifications"] });
    },
  });
}

interface DeleteNotificationsParams {
  notificationIds?: string[];
  deleteAll?: boolean;
}

async function deleteNotifications(params: DeleteNotificationsParams) {
  const { notificationIds, deleteAll = false } = params;
  const response = await fetch("/api/general/notifications", {
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

export function useDeleteGeneralNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["general-notifications"] });
    },
  });
}

