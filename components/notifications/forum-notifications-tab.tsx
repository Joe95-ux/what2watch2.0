"use client";

import { useState } from "react";
import { CheckCheck, MessageCircle, Reply, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForumNotifications, useMarkForumNotificationsAsRead, useDeleteForumNotifications, ForumNotification } from "@/hooks/use-forum-notifications";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function NotificationSkeleton() {
  return (
    <div className="flex gap-4 p-4 border-b">
      <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

function getNotificationMessage(notification: ForumNotification): string {
  const actorName = notification.actor?.username || notification.actor?.displayName || "Someone";
  
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
      return <MessageCircle className="h-4 w-4" />;
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

export function ForumNotificationsTab() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data, isLoading } = useForumNotifications(filter === "unread");
  const markAsRead = useMarkForumNotificationsAsRead();
  const deleteNotifications = useDeleteForumNotifications();
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleMarkAsRead = (notificationId?: string) => {
    if (notificationId) {
      markAsRead.mutate({ notificationIds: [notificationId] });
    } else {
      markAsRead.mutate({ markAllAsRead: true });
    }
  };

  const handleDelete = (notificationId: string) => {
    deleteNotifications.mutate({ notificationIds: [notificationId] });
  };

  const handleDeleteAll = () => {
    if (confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) {
      deleteNotifications.mutate({ deleteAll: true });
    }
  };

  return (
    <div>
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-sm"
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("unread")}
            className="text-sm"
          >
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMarkAsRead()}
              disabled={markAsRead.isPending}
              className="text-sm"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteAll}
              disabled={deleteNotifications.isPending}
              className="text-sm text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete all
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="bg-card border rounded-lg divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-card border rounded-lg text-center py-12 text-muted-foreground">
          <p>No notifications</p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg divide-y">
          {notifications.map((notification) => {
            const isOwnProfile = currentUser?.id === notification.actor?.id;
            const avatarUrl = isOwnProfile && contextAvatarUrl ? contextAvatarUrl : notification.actor?.avatarUrl || undefined;

            return (
              <div
                key={notification.id}
                className={cn(
                  "p-4 hover:bg-muted/50 transition-colors",
                  !notification.isRead && "bg-muted/30"
                )}
              >
                <div className="flex gap-3">
                  {/* Actor Avatar */}
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage 
                      src={avatarUrl} 
                      alt={notification.actor?.username || notification.actor?.displayName || "User"} 
                    />
                    <AvatarFallback>
                      {(notification.actor?.username || notification.actor?.displayName)
                        ? (notification.actor.username || notification.actor.displayName)[0].toUpperCase()
                        : "?"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getNotificationIcon(notification.type)}
                          <p className="text-sm font-medium">
                            {getNotificationMessage(notification)}
                          </p>
                        </div>
                        {notification.post && (
                          <Link
                            href={getNotificationLink(notification)}
                            className="block text-sm font-semibold text-primary hover:underline mb-1"
                          >
                            {notification.post.title}
                          </Link>
                        )}
                        {notification.reply && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {notification.reply.content.replace(/<[^>]*>/g, "").substring(0, 150)}
                            {notification.reply.content.length > 150 ? "..." : ""}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!notification.isRead && (
                            <DropdownMenuItem
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="cursor-pointer"
                            >
                              <CheckCheck className="h-4 w-4 mr-2" />
                              Mark as read
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link
                              href={getNotificationLink(notification)}
                              className="cursor-pointer"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              View post
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(notification.id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

