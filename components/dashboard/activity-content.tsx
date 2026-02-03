"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useActivityFeed, useActivityUsers, useActivityLike, type ActivityType, type Activity } from "@/hooks/use-activity";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import { 
  Film, 
  Star, 
  FileText, 
  Heart, 
  List, 
  Music, 
  UserPlus,
  Calendar,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, subDays } from "date-fns";
import { FilterSearchBar } from "@/components/ui/filter-search-bar";

const ACTIVITY_TYPES: { value: ActivityType | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Activity", icon: <Calendar className="h-4 w-4" /> },
  { value: "LOGGED_FILM", label: "Watched", icon: <Film className="h-4 w-4" /> },
  { value: "RATED_FILM", label: "Rated", icon: <Star className="h-4 w-4" /> },
  { value: "REVIEWED_FILM", label: "Reviewed", icon: <FileText className="h-4 w-4" /> },
  { value: "LIKED_FILM", label: "Liked", icon: <Heart className="h-4 w-4" /> },
  { value: "CREATED_LIST", label: "Lists", icon: <List className="h-4 w-4" /> },
  { value: "CREATED_PLAYLIST", label: "Playlists", icon: <Music className="h-4 w-4" /> },
  { value: "CREATED_FORUM_POST", label: "Forum Posts", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "CREATED_FORUM_REPLY", label: "Forum Replies", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "FOLLOWED_USER", label: "Followed", icon: <UserPlus className="h-4 w-4" /> },
];

function ActivityItem({ activity }: { activity: Activity }) {
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  const { toggleLike, isPending } = useActivityLike(activity.id, activity.likedByMe ?? false);
  const displayName = activity.user.username || activity.user.displayName || "Unknown";
  const username = activity.user.username || "unknown";
  const isCurrentUser = currentUser?.id === activity.user.id;
  const canLike = !!currentUser && !isCurrentUser;
  const likeCount = activity.likeCount ?? 0;

  const getActivityMessage = () => {
    switch (activity.type) {
      case "LOGGED_FILM":
        return (
          <>
            <span className="font-semibold">{displayName}</span> watched{" "}
            <span className="font-semibold">{activity.title}</span>
          </>
        );
      case "RATED_FILM":
        return (
          <>
            <span className="font-semibold">{displayName}</span> rated{" "}
            <span className="font-semibold">{activity.title}</span>{" "}
            <span className="inline-flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < (activity.rating || 0)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              ))}
            </span>
          </>
        );
      case "REVIEWED_FILM":
        return (
          <>
            <span className="font-semibold">{displayName}</span> reviewed{" "}
            <span className="font-semibold">{activity.title}</span>
          </>
        );
      case "LIKED_FILM":
        return (
          <>
            <span className="font-semibold">{displayName}</span> liked{" "}
            <span className="font-semibold">{activity.title}</span>
          </>
        );
      case "CREATED_LIST":
        return (
          <>
            <span className="font-semibold">{displayName}</span> created list{" "}
            <span className="font-semibold">{activity.listName}</span>
          </>
        );
      case "CREATED_PLAYLIST":
        return (
          <>
            <span className="font-semibold">{displayName}</span> created playlist{" "}
            <span className="font-semibold">{activity.listName}</span>
          </>
        );
      case "FOLLOWED_USER":
        return (
          <>
            <span className="font-semibold">{displayName}</span> followed{" "}
            {activity.followedUser && (
              <span className="font-semibold">
                {activity.followedUser.username || activity.followedUser.displayName}
              </span>
            )}
          </>
        );
      case "CREATED_FORUM_POST":
        const postMetadata = activity.metadata as { postId?: string; postSlug?: string; categoryName?: string } | null;
        const postLink = postMetadata?.postSlug || postMetadata?.postId;
        return (
          <>
            <span className="font-semibold">{displayName}</span> created a post{" "}
            {activity.title && postLink ? (
              <Link href={`/forum/${postLink}`} className="font-semibold hover:underline">
                {activity.title}
              </Link>
            ) : activity.title ? (
              <span className="font-semibold">{activity.title}</span>
            ) : null}
            {postMetadata?.categoryName && (
              <> in <span className="font-semibold">{postMetadata.categoryName}</span></>
            )}
          </>
        );
      case "CREATED_FORUM_REPLY":
        const replyMetadata = activity.metadata as { postId?: string; postSlug?: string; postTitle?: string } | null;
        const replyPostTitle = activity.title || replyMetadata?.postTitle;
        const replyPostLink = replyMetadata?.postSlug || replyMetadata?.postId;
        return (
          <>
            <span className="font-semibold">{displayName}</span> replied to{" "}
            {replyPostTitle && replyPostLink ? (
              <Link href={`/forum/${replyPostLink}`} className="font-semibold hover:underline">
                {replyPostTitle}
              </Link>
            ) : replyPostTitle ? (
              <span className="font-semibold">{replyPostTitle}</span>
            ) : (
              <span className="font-semibold">a post</span>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const getActivityIcon = () => {
    switch (activity.type) {
      case "LOGGED_FILM":
        return <Film className="h-4 w-4" />;
      case "RATED_FILM":
        return <Star className="h-4 w-4" />;
      case "REVIEWED_FILM":
        return <FileText className="h-4 w-4" />;
      case "LIKED_FILM":
        return <Heart className="h-4 w-4" />;
      case "CREATED_LIST":
        return <List className="h-4 w-4" />;
      case "CREATED_PLAYLIST":
        return <Music className="h-4 w-4" />;
      case "FOLLOWED_USER":
        return <UserPlus className="h-4 w-4" />;
      case "CREATED_FORUM_POST":
      case "CREATED_FORUM_REPLY":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const hasPoster = activity.posterPath && (activity.type === "LOGGED_FILM" || activity.type === "RATED_FILM" || activity.type === "REVIEWED_FILM" || activity.type === "LIKED_FILM");

  return (
    <div className="flex gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      {/* Avatar */}
      <Link href={`/${username}`} className="flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={isCurrentUser && contextAvatarUrl ? contextAvatarUrl : activity.user.avatarUrl || undefined} 
            alt={activity.user.username || activity.user.displayName || "Unknown"} 
          />
          <AvatarFallback>
            {displayName[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed">
              {getActivityMessage()}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
              {canLike && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-primary cursor-pointer"
                  onClick={() => toggleLike()}
                  disabled={isPending}
                >
                  <Heart
                    className={cn("h-3.5 w-3.5 mr-1", activity.likedByMe && "fill-primary text-primary")}
                  />
                  {likeCount > 0 ? likeCount : "Like"}
                </Button>
              )}
              {!canLike && likeCount > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {likeCount}
                </span>
              )}
            </div>
          </div>

          {/* Poster or Icon */}
          {hasPoster ? (
            <Link
              href={`/browse/${activity.mediaType}/${activity.tmdbId}`}
              className="flex-shrink-0"
            >
              <div className="relative h-16 w-12 rounded overflow-hidden border">
                <Image
                  src={getPosterUrl(activity.posterPath)}
                  alt={activity.title || ""}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </Link>
          ) : (
            <div className="flex-shrink-0 text-muted-foreground">
              {getActivityIcon()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 25;

const HIGHLIGHT_DURATION_MS = 3000;

export default function ActivityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const highlightActivityId = searchParams.get("highlight");
  const [showHighlight, setShowHighlight] = useState(false);
  const highlightDoneRef = useRef(false);

  const [selectedType, setSelectedType] = useState<ActivityType | "all">("all");
  const [selectedUserId, setSelectedUserId] = useState<string | "all">("all");
  const [sortBy] = useState<"createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [groupBy, setGroupBy] = useState<"none" | "day" | "week" | "month">("none");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch users for filter
  const { data: usersData } = useActivityUsers();
  const availableUsers = usersData || [];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (dateRange === "today") {
      startDate = format(now, "yyyy-MM-dd");
      endDate = format(now, "yyyy-MM-dd");
    } else if (dateRange === "week") {
      startDate = format(subDays(now, 7), "yyyy-MM-dd");
      endDate = format(now, "yyyy-MM-dd");
    } else if (dateRange === "month") {
      startDate = format(subDays(now, 30), "yyyy-MM-dd");
      endDate = format(now, "yyyy-MM-dd");
    } else if (dateRange === "custom") {
      startDate = customStartDate || undefined;
      endDate = customEndDate || undefined;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const { data, isLoading } = useActivityFeed(
    selectedType === "all" ? undefined : selectedType,
    50,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    debouncedSearch || undefined,
    groupBy === "none" ? undefined : groupBy,
    selectedUserId === "all" ? undefined : selectedUserId
  );

  const allActivities = useMemo(() => data?.activities || [], [data?.activities]);
  const grouped = data?.grouped;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, selectedUserId, debouncedSearch, dateRange, groupBy, sortOrder]);

  // Allow scroll+highlight to run again when highlight param changes (e.g. user clicks notification again)
  useEffect(() => {
    highlightDoneRef.current = false;
  }, [highlightActivityId]);

  // When landing with ?highlight=activityId, switch to the page that contains that activity
  const flatList = useMemo(
    () => (grouped ? Object.values(grouped).flat() : allActivities),
    [grouped, allActivities]
  );
  useEffect(() => {
    if (!highlightActivityId || flatList.length === 0) return;
    const index = flatList.findIndex((a) => a.id === highlightActivityId);
    if (index >= 0) {
      const targetPage = Math.floor(index / ITEMS_PER_PAGE) + 1;
      setCurrentPage(targetPage);
    }
  }, [highlightActivityId, flatList]);

  // Pagination calculations
  const totalItems = useMemo(() => {
    return grouped 
      ? Object.values(grouped).flat().length 
      : allActivities.length;
  }, [grouped, allActivities]);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Generate page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Add ellipsis if current page is far from start
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      
      // Add pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      // Add ellipsis if current page is far from end
      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  }, [currentPage, totalPages]);

  // Paginated activities
  const paginatedActivities = useMemo(() => {
    if (grouped) {
      const allGroupedActivities = Object.values(grouped).flat();
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return allGroupedActivities.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return allActivities.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allActivities, grouped, currentPage]);

  // For grouped display, we need to reconstruct the grouped structure from paginated items
  const paginatedGrouped = useMemo(() => {
    if (!grouped) return null;
    const allGroupedActivities = Object.values(grouped).flat();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = allGroupedActivities.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    
    // Reconstruct grouped structure
    const newGrouped: Record<string, Activity[]> = {};
    paginatedItems.forEach((activity) => {
      // Find which group this activity belongs to
      for (const [key, activities] of Object.entries(grouped)) {
        if (activities.some(a => a.id === activity.id)) {
          if (!newGrouped[key]) {
            newGrouped[key] = [];
          }
          newGrouped[key].push(activity);
          break;
        }
      }
    });
    return newGrouped;
  }, [grouped, currentPage]);

  // Scroll to highlighted activity and show pulse, then clear URL
  const currentPageItemIds = useMemo(() => {
    if (paginatedGrouped) {
      return Object.values(paginatedGrouped).flat().map((a) => a.id);
    }
    return paginatedActivities.map((a) => a.id);
  }, [paginatedGrouped, paginatedActivities]);
  useEffect(() => {
    if (
      !highlightActivityId ||
      highlightDoneRef.current ||
      !currentPageItemIds.includes(highlightActivityId)
    ) {
      return;
    }
    highlightDoneRef.current = true;
    const timer = setTimeout(() => {
      const el = document.getElementById(`activity-${highlightActivityId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setShowHighlight(true);
      const clearTimer = setTimeout(() => {
        setShowHighlight(false);
        const next = new URLSearchParams(searchParams.toString());
        next.delete("highlight");
        const q = next.toString();
        router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      }, HIGHLIGHT_DURATION_MS);
      return () => clearTimeout(clearTimer);
    }, 150);
    return () => clearTimeout(timer);
  }, [highlightActivityId, currentPageItemIds, pathname, router, searchParams]);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="container max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Activity Feed</h1>
          <p className="text-muted-foreground mt-2">
            See what your friends are watching and rating
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <FilterSearchBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search activities..."
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            filters={[
              {
                label: "Type",
                value: selectedType,
                options: ACTIVITY_TYPES.map((type) => ({
                  value: type.value,
                  label: type.label,
                  icon: type.icon,
                })),
                onValueChange: (value) => setSelectedType(value as ActivityType | "all"),
              },
              {
                label: "Date",
                value: dateRange,
                options: [
                  { value: "all", label: "All Time", icon: <CalendarIcon className="h-4 w-4" /> },
                  { value: "today", label: "Today", icon: <CalendarIcon className="h-4 w-4" /> },
                  { value: "week", label: "Last 7 Days", icon: <CalendarIcon className="h-4 w-4" /> },
                  { value: "month", label: "Last 30 Days", icon: <CalendarIcon className="h-4 w-4" /> },
                  { value: "custom", label: "Custom Range", icon: <CalendarIcon className="h-4 w-4" /> },
                ],
                onValueChange: (value) => setDateRange(value as typeof dateRange),
              },
              {
                label: "User",
                value: selectedUserId,
                options: [
                  {
                    value: "all",
                    label: "All Users",
                    icon: <UserPlus className="h-4 w-4" />,
                  },
                  ...availableUsers.map((user) => ({
                    value: user.id,
                    label: user.username || user.displayName || "Unknown",
                    icon: (
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(user.username || user.displayName || "U")[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ),
                  })),
                ],
                onValueChange: (value) => setSelectedUserId(value),
              },
              {
                label: "Group By",
                value: groupBy,
                options: [
                  { value: "none", label: "None" },
                  { value: "day", label: "Day" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                ],
                onValueChange: (value) => setGroupBy(value as typeof groupBy),
              },
            ]}
            hasActiveFilters={
              selectedType !== "all" ||
              selectedUserId !== "all" ||
              dateRange !== "all" ||
              groupBy !== "none" ||
              !!searchQuery
            }
            onClearAll={() => {
              setSelectedType("all");
              setSelectedUserId("all");
              setDateRange("all");
              setGroupBy("none");
              setSearchQuery("");
              setCustomStartDate("");
              setCustomEndDate("");
            }}
          />

          {/* Custom Date Range Inputs */}
          {dateRange === "custom" && (
            <div className="w-full mt-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label htmlFor="start-date" className="text-xs text-muted-foreground mb-1 block">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date" className="text-xs text-muted-foreground mb-1 block">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity List */}
        <div className="bg-card border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border-b last:border-b-0">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-16 w-12 rounded" />
                </div>
              ))}
            </div>
          ) : totalItems === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                {debouncedSearch
                  ? "No activities found matching your search."
                  : selectedType !== "all" || selectedUserId !== "all" || dateRange !== "all" || groupBy !== "none"
                  ? "No activities found matching your filters. Try adjusting your filters."
                  : "No activity yet. Start following users to see their activity!"}
              </p>
            </div>
          ) : paginatedGrouped ? (
            <div className="divide-y">
              {Object.entries(paginatedGrouped)
                .sort(([a], [b]) => {
                  // Sort groups by date (newest first)
                  return sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b);
                })
                .map(([groupKey, groupActivities]) => (
                  <div key={groupKey}>
                    <div className="px-4 py-2 bg-muted/50 border-b">
                      <h3 className="text-sm font-semibold text-foreground">
                        {groupBy === "day" && format(new Date(groupKey), "EEEE, MMMM d, yyyy")}
                        {groupBy === "week" && groupKey}
                        {groupBy === "month" && format(new Date(`${groupKey}-01`), "MMMM yyyy")}
                      </h3>
                    </div>
                    {groupActivities.map((activity) => (
                      <div
                        key={activity.id}
                        id={`activity-${activity.id}`}
                        className={cn(
                          highlightActivityId === activity.id &&
                            showHighlight &&
                            "animate-pulse rounded-lg bg-muted/60 transition-colors"
                        )}
                      >
                        <ActivityItem activity={activity} />
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ) : (
            <div className="divide-y">
              {paginatedActivities.map((activity) => (
                <div
                  key={activity.id}
                  id={`activity-${activity.id}`}
                  className={cn(
                    highlightActivityId === activity.id &&
                      showHighlight &&
                      "animate-pulse rounded-lg bg-muted/60 transition-colors"
                  )}
                >
                  <ActivityItem activity={activity} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {pageNumbers.map((page, index) => {
                    if (page === "ellipsis") {
                      return (
                        <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[40px] flex-shrink-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-shrink-0"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

