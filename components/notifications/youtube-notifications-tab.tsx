"use client";

import { useState } from "react";
import { CheckCheck, ExternalLink, MoreVertical, Trash2 } from "lucide-react";
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
import { useYouTubeNotifications, useMarkNotificationsAsRead, useDeleteYouTubeNotifications } from "@/hooks/use-youtube-notifications";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export function YouTubeNotificationsTab() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data, isLoading } = useYouTubeNotifications(filter === "unread");
  const markAsRead = useMarkNotificationsAsRead();
  const deleteNotifications = useDeleteYouTubeNotifications();

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
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 hover:bg-muted/50 transition-colors ${
                !notification.isRead ? "bg-muted/30" : ""
              }`}
            >
              <div className="flex gap-3">
                {/* Channel Avatar */}
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage 
                    src={notification.channelThumbnail || undefined} 
                    alt={notification.channelTitle || "Channel"} 
                  />
                  <AvatarFallback>
                    {(notification.channelTitle || "C")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 mb-1">
                        <span className="font-semibold">{notification.channelTitle}</span>
                        {" "}uploaded a new video: {notification.videoTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(notification.publishedAt), {
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
                            href={notification.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Watch on YouTube
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
                  
                  {/* Video Thumbnail Preview */}
                  <div className="mt-3">
                    <Link
                      href={notification.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="relative h-32 w-full max-w-md rounded overflow-hidden bg-muted group">
                        {notification.videoThumbnail ? (
                          <Image
                            src={notification.videoThumbnail}
                            alt={notification.videoTitle}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            unoptimized
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      </div>
                    </Link>
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

