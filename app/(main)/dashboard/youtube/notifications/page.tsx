"use client";

import { useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useYouTubeNotifications, useMarkNotificationsAsRead } from "@/hooks/use-youtube-notifications";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function YouTubeNotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data, isLoading } = useYouTubeNotifications(filter === "unread");
  const markAsRead = useMarkNotificationsAsRead();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleMarkAsRead = (notificationId?: string) => {
    if (notificationId) {
      markAsRead.mutate({ notificationIds: [notificationId] });
    } else {
      markAsRead.mutate({ markAllAsRead: true });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-semibold">Notifications</h1>
              <p className="text-muted-foreground">
                New videos from your favorite channels
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => handleMarkAsRead()}
              disabled={markAsRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex gap-4 p-4 rounded-lg border transition-colors ${
                !notification.isRead ? "bg-muted/50 border-primary/20" : ""
              }`}
            >
              <div className="relative h-20 w-32 flex-shrink-0 rounded overflow-hidden bg-muted">
                {notification.videoThumbnail ? (
                  <Image
                    src={notification.videoThumbnail}
                    alt={notification.videoTitle}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-2">
                      {notification.videoTitle}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.channelTitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.publishedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={notification.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Watch
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

