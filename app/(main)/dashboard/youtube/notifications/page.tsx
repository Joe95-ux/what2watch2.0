"use client";

import { useState, useMemo } from "react";
import { CheckCheck, ExternalLink, MoreVertical, Trash2, Search, Filter, X, ArrowUpDown, ArrowDown, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

export default function YouTubeNotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<"date" | "channel">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const { data, isLoading } = useYouTubeNotifications(filter === "unread");
  const markAsRead = useMarkNotificationsAsRead();
  const deleteNotifications = useDeleteYouTubeNotifications();

  const allNotifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  
  // Get unique channels for filter
  const uniqueChannels = useMemo(() => {
    const channels = new Map<string, { title: string; thumbnail: string | null }>();
    allNotifications.forEach((notif) => {
      if (notif.channelTitle && !channels.has(notif.channelTitle)) {
        channels.set(notif.channelTitle, {
          title: notif.channelTitle,
          thumbnail: notif.channelThumbnail || null,
        });
      }
    });
    return Array.from(channels.values());
  }, [allNotifications]);
  
  // Filter and sort notifications
  const notifications = useMemo(() => {
    let filtered = [...allNotifications];
    
    // Apply read/unread filter
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.isRead);
    }
    
    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((n) => 
        n.videoTitle?.toLowerCase().includes(query) ||
        n.channelTitle?.toLowerCase().includes(query)
      );
    }
    
    // Apply channel filter
    if (channelFilter !== "all") {
      filtered = filtered.filter((n) => n.channelTitle === channelFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      } else if (sortField === "channel") {
        comparison = (a.channelTitle || "").localeCompare(b.channelTitle || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [allNotifications, filter, debouncedSearchQuery, channelFilter, sortField, sortOrder]);

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
    <div className="container max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              New videos from your favorite channels
            </p>
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
            {allNotifications.length > 0 && (
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
      </div>

      {/* Search, Sort, and Filter Row */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-0 flex-1 sm:max-w-[20rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-9 h-9 text-muted-foreground placeholder:text-muted-foreground/60",
                searchQuery ? "pr-20" : "pr-12"
              )}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              {/* Sort Dropdown - Inside Search Bar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 cursor-pointer",
                      sortOrder !== "desc" && "text-primary"
                    )}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2">
                    <div className="text-xs font-medium mb-2 px-2">Sort by</div>
                    {[
                      { value: "date", label: "Date" },
                      { value: "channel", label: "Channel" },
                    ].map((field) => (
                      <DropdownMenuItem
                        key={field.value}
                        onClick={() => {
                          if (sortField === field.value) {
                            setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                          } else {
                            setSortField(field.value as typeof sortField);
                            setSortOrder("desc");
                          }
                        }}
                        className={cn(
                          "cursor-pointer",
                          sortField === field.value && "bg-accent"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {sortField === field.value && sortOrder === "desc" && (
                            <ArrowDown className="h-4 w-4" />
                          )}
                          {sortField === field.value && sortOrder === "asc" && (
                            <ArrowUp className="h-4 w-4" />
                          )}
                          {sortField !== field.value && <div className="h-4 w-4" />}
                          {field.label}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortOrder("desc");
                    }}
                    className={cn("cursor-pointer", sortOrder === "desc" && "bg-accent")}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4" />
                      Newest First
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortOrder("asc");
                    }}
                    className={cn("cursor-pointer", sortOrder === "asc" && "bg-accent")}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      Oldest First
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filter Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFilterRowOpen(!isFilterRowOpen)}
                className={cn(
                  "h-9 w-9 rounded-full cursor-pointer",
                  (filter !== "all" || channelFilter !== "all") && "bg-primary/10 text-primary"
                )}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter notifications</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Filter Row - Collapsible */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isFilterRowOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="overflow-x-auto scrollbar-hide pb-2">
            <div className="flex items-center gap-4 min-w-max px-1">
              {/* Read/Unread Filter */}
              <DropdownMenu
                open={openDropdowns["Status"] || false}
                onOpenChange={(open) => setOpenDropdowns((prev) => ({ ...prev, Status: open }))}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setOpenDropdowns((prev) => ({ ...prev, Status: !prev.Status }))}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/80 hover:text-foreground dark:hover:text-foreground transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:outline-none rounded-sm px-2 py-1"
                  >
                    <span>Status:</span>
                    <span className="font-medium">
                      {filter === "all" ? "All" : "Unread"}
                      {filter === "unread" && unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </span>
                    {openDropdowns["Status"] ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {[
                    { value: "all", label: "All" },
                    { value: "unread", label: "Unread" },
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        setFilter(option.value as typeof filter);
                        setOpenDropdowns((prev) => ({ ...prev, Status: false }));
                      }}
                      className={cn("cursor-pointer", filter === option.value && "bg-accent")}
                    >
                      {option.label}
                      {option.value === "unread" && unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Channel Filter */}
              {uniqueChannels.length > 0 && (
                <DropdownMenu
                  open={openDropdowns["Channel"] || false}
                  onOpenChange={(open) => setOpenDropdowns((prev) => ({ ...prev, Channel: open }))}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setOpenDropdowns((prev) => ({ ...prev, Channel: !prev.Channel }))}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/80 hover:text-foreground dark:hover:text-foreground transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:outline-none rounded-sm px-2 py-1"
                    >
                      <span>Channel:</span>
                      <span className="font-medium">
                        {channelFilter === "all" ? "All Channels" : channelFilter}
                      </span>
                      {openDropdowns["Channel"] ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 max-h-[300px] overflow-y-auto">
                    <DropdownMenuItem
                      onClick={() => {
                        setChannelFilter("all");
                        setOpenDropdowns((prev) => ({ ...prev, Channel: false }));
                      }}
                      className={cn("cursor-pointer", channelFilter === "all" && "bg-accent")}
                    >
                      All Channels
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {uniqueChannels.map((channel) => (
                      <DropdownMenuItem
                        key={channel.title}
                        onClick={() => {
                          setChannelFilter(channel.title);
                          setOpenDropdowns((prev) => ({ ...prev, Channel: false }));
                        }}
                        className={cn("cursor-pointer", channelFilter === channel.title && "bg-accent")}
                      >
                        {channel.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Clear Filters */}
              {(filter !== "all" || channelFilter !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilter("all");
                    setChannelFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-xs"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
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

