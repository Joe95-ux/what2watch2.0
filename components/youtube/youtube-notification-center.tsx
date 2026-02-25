"use client";

import { useState } from "react";
import { Bell, X, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useYouTubeNotifications, useMarkNotificationsAsRead } from "@/hooks/use-youtube-notifications";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { decodeHtmlEntities } from "@/lib/utils";

export function YouTubeNotificationCenter() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useYouTubeNotifications(false);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">YouTube Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMarkAsRead()}
              disabled={markAsRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="relative h-12 w-20 flex-shrink-0 rounded overflow-hidden bg-muted">
                      {notification.videoThumbnail ? (
                        <Image
                          src={notification.videoThumbnail}
                          alt={decodeHtmlEntities(notification.videoTitle || "")}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">
                            {decodeHtmlEntities(notification.videoTitle || "")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {decodeHtmlEntities(notification.channelTitle || "")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.publishedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            asChild
                          >
                            <Link
                              href={notification.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-4 border-t">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/youtube/notifications">View all</Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

