"use client";

import { useState } from "react";
import { CheckCheck, MessageCircle, Reply, ExternalLink, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useForumNotifications, useMarkForumNotificationsAsRead, ForumNotification } from "@/hooks/use-forum-notifications";
import { useYouTubeNotifications, useMarkNotificationsAsRead, YouTubeNotification } from "@/hooks/use-youtube-notifications";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";

type NotificationTab = "youtube" | "general" | "forum";

function getForumNotificationMessage(notification: ForumNotification): string {
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

function getForumNotificationIcon(type: ForumNotification["type"]) {
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

function getForumNotificationLink(notification: ForumNotification): string {
  if (notification.post?.slug) {
    return `/forum/${notification.post.slug}`;
  }
  if (notification.post?.id) {
    return `/forum/${notification.post.id}`;
  }
  return "/forum";
}

interface UnifiedNotificationCenterMobileProps {
  onClose?: () => void;
}

export function UnifiedNotificationCenterMobile({ onClose }: UnifiedNotificationCenterMobileProps) {
  const [activeTab, setActiveTab] = useState<NotificationTab>("youtube");
  
  const { data: forumData, isLoading: isLoadingForum } = useForumNotifications(false);
  const { data: youtubeData, isLoading: isLoadingYoutube } = useYouTubeNotifications(false);
  const markForumAsRead = useMarkForumNotificationsAsRead();
  const markYouTubeAsRead = useMarkNotificationsAsRead();

  const forumNotifications = forumData?.notifications || [];
  const youtubeNotifications = youtubeData?.notifications || [];
  const forumUnreadCount = forumData?.unreadCount || 0;
  const youtubeUnreadCount = youtubeData?.unreadCount || 0;

  const handleMarkForumAsRead = (notificationId?: string) => {
    if (notificationId) {
      markForumAsRead.mutate({ notificationIds: [notificationId] });
    } else {
      markForumAsRead.mutate({ markAllAsRead: true });
    }
  };

  const handleMarkYouTubeAsRead = (notificationId?: string) => {
    if (notificationId) {
      markYouTubeAsRead.mutate({ notificationIds: [notificationId] });
    } else {
      markYouTubeAsRead.mutate({ markAllAsRead: true });
    }
  };

  const handleMarkAllAsRead = () => {
    if (activeTab === "forum") {
      handleMarkForumAsRead();
    } else if (activeTab === "youtube") {
      handleMarkYouTubeAsRead();
    }
  };

  const getActiveTabUnreadCount = () => {
    switch (activeTab) {
      case "forum":
        return forumUnreadCount;
      case "youtube":
        return youtubeUnreadCount;
      default:
        return 0;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <h3 className="font-semibold text-lg">Notifications</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 w-8 p-0"
          >
            <Link href="/settings?section=notifications" onClick={onClose}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          {getActiveTabUnreadCount() > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markForumAsRead.isPending || markYouTubeAsRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationTab)} className="w-full flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b h-auto p-0 bg-transparent flex-shrink-0">
          <TabsTrigger 
            value="youtube" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            YouTube
            {youtubeUnreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-xs">
                {youtubeUnreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="general" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            General
          </TabsTrigger>
          <TabsTrigger 
            value="forum" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Forum
            {forumUnreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-xs">
                {forumUnreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="youtube" className="m-0 flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            {isLoadingYoutube ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : youtubeNotifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No YouTube notifications
              </div>
            ) : (
              <div className="divide-y">
                {youtubeNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors",
                      !notification.isRead && "bg-muted/30"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="relative h-12 w-20 flex-shrink-0 rounded overflow-hidden bg-muted">
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
                            <p className="text-sm font-medium line-clamp-2">
                              {notification.videoTitle}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.channelTitle}
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
                                onClick={() => handleMarkYouTubeAsRead(notification.id)}
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
                                onClick={onClose}
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
          {youtubeNotifications.length > 0 && (
            <div className="p-4 border-t flex-shrink-0">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/youtube/notifications" onClick={onClose}>View all</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="general" className="m-0 flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-8 text-center text-sm text-muted-foreground">
              No general notifications yet
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="forum" className="m-0 flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            {isLoadingForum ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : forumNotifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No forum notifications
              </div>
            ) : (
              <div className="divide-y">
                {forumNotifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={getForumNotificationLink(notification)}
                    onClick={() => {
                      if (!notification.isRead) {
                        handleMarkForumAsRead(notification.id);
                      }
                      onClose?.();
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
                                {getForumNotificationIcon(notification.type)}
                                <p className="text-sm font-medium line-clamp-1">
                                  {getForumNotificationMessage(notification)}
                                </p>
                              </div>
                              {notification.post && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {notification.post.title}
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
                                  handleMarkForumAsRead(notification.id);
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
          {forumNotifications.length > 0 && (
            <div className="p-4 border-t flex-shrink-0">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/forum/notifications" onClick={onClose}>View all</Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

