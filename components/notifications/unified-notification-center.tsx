"use client";

import { useState } from "react";
import { Bell, X, CheckCheck, MessageCircle, Reply, ExternalLink, Settings, Megaphone, TrendingUp } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useForumNotifications, useMarkForumNotificationsAsRead, useDeleteForumNotifications, ForumNotification } from "@/hooks/use-forum-notifications";
import { useYouTubeNotifications, useMarkNotificationsAsRead, useDeleteYouTubeNotifications, YouTubeNotification } from "@/hooks/use-youtube-notifications";
import { useGeneralNotifications, useMarkGeneralNotificationsAsRead, useDeleteGeneralNotifications, GeneralNotification } from "@/hooks/use-general-notifications";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";

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

function getGeneralNotificationIcon(type: string) {
  switch (type) {
    case "FEEDBACK_SUBMITTED":
      return <Megaphone className="h-4 w-4" />;
    case "TREND_ALERT_TRIGGERED":
      return <TrendingUp className="h-4 w-4" />;
    case "NEW_FOLLOWER":
    case "ACTIVITY_LIKED":
      return <Bell className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getGeneralNotificationTypeLabel(type: string): string {
  switch (type) {
    case "FEEDBACK_SUBMITTED":
      return "Feedback";
    case "TREND_ALERT_TRIGGERED":
      return "Trend Alert";
    case "NEW_FOLLOWER":
      return "New Follower";
    case "ACTIVITY_LIKED":
      return "Activity Liked";
    default:
      return "General";
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

export function UnifiedNotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>("youtube");
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  
  const { data: forumData, isLoading: isLoadingForum } = useForumNotifications(false);
  const { data: youtubeData, isLoading: isLoadingYoutube } = useYouTubeNotifications(false);
  const { data: generalData, isLoading: isLoadingGeneral } = useGeneralNotifications(false);
  const markForumAsRead = useMarkForumNotificationsAsRead();
  const markYouTubeAsRead = useMarkNotificationsAsRead();
  const markGeneralAsRead = useMarkGeneralNotificationsAsRead();
  const deleteForumNotifications = useDeleteForumNotifications();
  const deleteYouTubeNotifications = useDeleteYouTubeNotifications();
  const deleteGeneralNotifications = useDeleteGeneralNotifications();

  const forumNotifications = forumData?.notifications || [];
  const youtubeNotifications = youtubeData?.notifications || [];
  const generalNotifications = generalData?.notifications || [];
  const forumUnreadCount = forumData?.unreadCount || 0;
  const youtubeUnreadCount = youtubeData?.unreadCount || 0;
  const generalUnreadCount = generalData?.unreadCount || 0;
  const totalUnreadCount = forumUnreadCount + youtubeUnreadCount + generalUnreadCount;

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

  const handleMarkGeneralAsRead = (notificationId?: string) => {
    if (notificationId) {
      markGeneralAsRead.mutate({ notificationIds: [notificationId] });
    } else {
      markGeneralAsRead.mutate({ markAllAsRead: true });
    }
  };

  const handleMarkAllAsRead = () => {
    if (activeTab === "forum") {
      handleMarkForumAsRead();
    } else if (activeTab === "youtube") {
      handleMarkYouTubeAsRead();
    } else if (activeTab === "general") {
      handleMarkGeneralAsRead();
    }
  };

  const getActiveTabUnreadCount = () => {
    switch (activeTab) {
      case "forum":
        return forumUnreadCount;
      case "youtube":
        return youtubeUnreadCount;
      case "general":
        return generalUnreadCount;
      default:
        return 0;
    }
  };

  const handleGeneralNotificationClick = (notification: GeneralNotification) => {
    if (!notification.isRead) {
      handleMarkGeneralAsRead(notification.id);
    }
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative cursor-pointer">
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 w-8 p-0"
            >
              <Link href="/settings?section=notifications">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            {getActiveTabUnreadCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markForumAsRead.isPending || markYouTubeAsRead.isPending || markGeneralAsRead.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationTab)} className="w-full">
          <TabsList className="w-full rounded-none border-b h-auto p-0 bg-transparent">
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
              {generalUnreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-xs">
                  {generalUnreadCount}
                </Badge>
              )}
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

          <TabsContent value="youtube" className="m-0">
            <ScrollArea className="h-[400px]">
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
                        !notification.isRead && "border-l-[3px] border-l-primary bg-primary/10 dark:bg-primary/20"
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteYouTubeNotifications.mutate({ notificationIds: [notification.id] });
                                }}
                                disabled={deleteYouTubeNotifications.isPending}
                              >
                                <X className="h-3 w-3" />
                              </Button>
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
            {youtubeNotifications.length > 0 && (
              <div className="p-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/youtube/notifications">View all</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="general" className="m-0">
            <ScrollArea className="h-[400px]">
              {isLoadingGeneral ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : generalNotifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No general notifications yet
                </div>
              ) : (
                <div className="divide-y">
                  {generalNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleGeneralNotificationClick(notification)}
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteGeneralNotifications.mutate({ notificationIds: [notification.id] });
                              }}
                              disabled={deleteGeneralNotifications.isPending}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {generalNotifications.length > 0 && (
              <div className="p-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/notifications">View all</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="forum" className="m-0">
            <ScrollArea className="h-[400px]">
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
                        setOpen(false);
                      }}
                    >
                      <div
                        className={cn(
                          "p-4 hover:bg-muted/50 transition-colors",
                          !notification.isRead && "border-l-[3px] border-l-primary bg-primary/10 dark:bg-primary/20"
                        )}
                      >
                        <div className="flex gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage 
                              src={
                                notification.actor?.id && currentUser?.id === notification.actor.id && contextAvatarUrl
                                  ? contextAvatarUrl
                                  : notification.actor?.avatarUrl || undefined
                              } 
                            />
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteForumNotifications.mutate({ notificationIds: [notification.id] });
                                }}
                                disabled={deleteForumNotifications.isPending}
                              >
                                <X className="h-3 w-3" />
                              </Button>
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
              <div className="p-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/forum/notifications">View all</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
