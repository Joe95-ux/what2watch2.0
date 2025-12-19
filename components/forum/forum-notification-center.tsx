"use client";

import { useState } from "react";
import { Bell, X, CheckCheck, MessageCircle, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForumNotifications, useMarkForumNotificationsAsRead, ForumNotification } from "@/hooks/use-forum-notifications";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function getNotificationMessage(notification: ForumNotification): string {
  const actorName = notification.actor?.displayName || "Someone";
  
  switch (notification.type) {
    case "NEW_REPLY":
      return `${actorName} replied to your post`;
    case "REPLY_TO_REPLY":
      return `${actorName} replied to your comment`;
    case "POST_MENTION":
      return `${actorName} mentioned you in a post`;
    case "REPLY_MENTION":
      return `${actorName} mentioned you in a comment`;
    default:
      return "New notification";
  }
}

function getNotificationIcon(type: ForumNotification["type"]) {
  switch (type) {
    case "NEW_REPLY":
    case "REPLY_TO_REPLY":
      return <Reply className="h-4 w-4" />;
    case "POST_MENTION":
    case "REPLY_MENTION":
      return <MessageCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getNotificationLink(notification: ForumNotification): string {
  if (notification.post?.slug) {
    return `/forum/${notification.post.slug}`;
  }
  if (notification.post?.id) {
    return `/forum/${notification.post.id}`;
  }
  return "/forum";
}

export function ForumNotificationCenter() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useForumNotifications(false);
  const markAsRead = useMarkForumNotificationsAsRead();

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
          <h3 className="font-semibold">Forum Notifications</h3>
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
                <Link
                  key={notification.id}
                  href={getNotificationLink(notification)}
                  onClick={() => {
                    if (!notification.isRead) {
                      handleMarkAsRead(notification.id);
                    }
                    setOpen(false);
                  }}
                >
                  <div
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors",
                      !notification.isRead && "bg-muted/30"
                    )}
                  >
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={notification.actor?.avatarUrl || undefined} />
                        <AvatarFallback>
                          {notification.actor?.displayName
                            ? notification.actor.displayName[0].toUpperCase()
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getNotificationIcon(notification.type)}
                              <p className="text-sm font-medium line-clamp-1">
                                {getNotificationMessage(notification)}
                              </p>
                            </div>
                            {notification.post && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {notification.post.title}
                              </p>
                            )}
                            {notification.reply && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {notification.reply.content.replace(/<[^>]*>/g, "").substring(0, 100)}
                                {notification.reply.content.length > 100 ? "..." : ""}
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
                                e.preventDefault();
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
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-4 border-t">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/forum/notifications">View all</Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

