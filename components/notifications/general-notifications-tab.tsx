"use client";

import { useGeneralNotifications, useMarkGeneralNotificationsAsRead, GeneralNotification } from "@/hooks/use-general-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Megaphone, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

function getGeneralNotificationIcon(type: string) {
  switch (type) {
    case "FEEDBACK_SUBMITTED":
      return <Megaphone className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getGeneralNotificationTypeLabel(type: string): string {
  switch (type) {
    case "FEEDBACK_SUBMITTED":
      return "Feedback";
    default:
      return "General";
  }
}

export function GeneralNotificationsTab() {
  const router = useRouter();
  const { data, isLoading } = useGeneralNotifications(false);
  const markAsRead = useMarkGeneralNotificationsAsRead();

  const notifications = data?.notifications || [];

  const handleNotificationClick = (notification: GeneralNotification) => {
    if (!notification.isRead) {
      markAsRead.mutate({ notificationIds: [notification.id] });
    }
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  const handleMarkAsRead = (notificationId?: string) => {
    if (notificationId) {
      markAsRead.mutate({ notificationIds: [notificationId] });
    } else {
      markAsRead.mutate({ markAllAsRead: true });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-card border rounded-lg text-center py-12 text-muted-foreground">
        <p>No general notifications at this time</p>
        <p className="text-xs mt-2">General notifications will appear here when available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">General Notifications</h3>
        {notifications.some((n) => !n.isRead) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAsRead()}
            disabled={markAsRead.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={cn(
              "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
              !notification.isRead && "bg-muted/30"
            )}
          >
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {getGeneralNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {getGeneralNotificationTypeLabel(notification.type)}
                      </Badge>
                      <p className="text-sm font-medium line-clamp-1">
                        {notification.title}
                      </p>
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

