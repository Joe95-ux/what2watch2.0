"use client";

import { useState } from "react";
import { useGeneralNotifications, useMarkGeneralNotificationsAsRead, useDeleteGeneralNotifications, GeneralNotification } from "@/hooks/use-general-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Megaphone, Bell, CheckCheck, Trash2, MoreVertical, MoreHorizontal, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function getGeneralNotificationIcon(type: string) {
  switch (type) {
    case "FEEDBACK_SUBMITTED":
      return <Megaphone className="h-4 w-4" />;
    case "TREND_ALERT_TRIGGERED":
      return <TrendingUp className="h-4 w-4" />;
    case "NEW_FOLLOWER":
      return <Bell className="h-4 w-4" />;
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

export function GeneralNotificationsTab() {
  const router = useRouter();
  const { data, isLoading } = useGeneralNotifications(false);
  const markAsRead = useMarkGeneralNotificationsAsRead();
  const deleteNotifications = useDeleteGeneralNotifications();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

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

  const handleDelete = (notificationId: string) => {
    setNotificationToDelete(notificationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (notificationToDelete) {
      deleteNotifications.mutate({ notificationIds: [notificationToDelete] });
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    }
  };

  const handleDeleteAll = () => {
    setDeleteAllDialogOpen(true);
  };

  const handleDeleteAllConfirm = () => {
    deleteNotifications.mutate({ deleteAll: true });
    setDeleteAllDialogOpen(false);
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
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">General Notifications</h3>
        {/* Desktop: Show buttons */}
        <div className="hidden sm:flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMarkAsRead()}
              disabled={markAsRead.isPending}
              className="text-sm cursor-pointer"
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
              className="text-sm text-destructive hover:text-destructive cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete all
            </Button>
          )}
        </div>

        {/* Mobile: Show dropdown menu */}
        {(unreadCount > 0 || notifications.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="sm:hidden cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {unreadCount > 0 && (
                <DropdownMenuItem
                  onClick={() => handleMarkAsRead()}
                  disabled={markAsRead.isPending}
                  className="cursor-pointer"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all as read
                </DropdownMenuItem>
              )}
              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={handleDeleteAll}
                    disabled={deleteNotifications.isPending}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete all
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={cn(
              "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
              !notification.isRead && "border-l-[3px] border-l-[#1447E6] bg-blue-50 dark:[background:var(--unread-notification-bg)]"
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      {!notification.isRead && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="cursor-pointer"
                        >
                          <CheckCheck className="h-4 w-4 mr-2" />
                          Mark as read
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
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
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteNotifications.isPending}
            >
              {deleteNotifications.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all notifications? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteNotifications.isPending}
            >
              {deleteNotifications.isPending ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

