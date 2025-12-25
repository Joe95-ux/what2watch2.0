"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import { 
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Bookmark,
  FileText,
  Lock,
  Archive,
} from "lucide-react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { FilterSearchBar } from "@/components/ui/filter-search-bar";
import { Calendar as CalendarIcon } from "lucide-react";

interface Activity {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  metadata?: Record<string, any>;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

function ActivityItem({ activity }: { activity: Activity }) {
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  const isCurrentUser = currentUser?.id === activity.user.id;

  const getActivityMessage = () => {
    switch (activity.type) {
      case "CREATED_FORUM_POST":
        return (
          <>
            You created a post{" "}
            <Link 
              href={activity.metadata?.postSlug ? `/forum/${activity.metadata.postSlug}` : "/forum"}
              className="font-semibold text-primary hover:underline"
            >
              {activity.title}
            </Link>
          </>
        );
      case "CREATED_FORUM_REPLY":
        return (
          <>
            You replied to{" "}
            <Link 
              href={activity.metadata?.postSlug ? `/forum/${activity.metadata.postSlug}` : "/forum"}
              className="font-semibold text-primary hover:underline"
            >
              {activity.title}
            </Link>
          </>
        );
      case "DRAFT_POST":
        return (
          <>
            You created a draft{" "}
            <Link 
              href={activity.metadata?.postSlug ? `/forum/${activity.metadata.postSlug}` : "/forum"}
              className="font-semibold text-primary hover:underline"
            >
              {activity.title}
            </Link>
          </>
        );
      case "UPVOTED_POST":
        return (
          <>
            You upvoted{" "}
            <Link 
              href={activity.metadata?.postSlug ? `/forum/${activity.metadata.postSlug}` : "/forum"}
              className="font-semibold text-primary hover:underline"
            >
              {activity.title}
            </Link>
          </>
        );
      case "DOWNVOTED_POST":
        return (
          <>
            You downvoted{" "}
            <Link 
              href={activity.metadata?.postSlug ? `/forum/${activity.metadata.postSlug}` : "/forum"}
              className="font-semibold text-primary hover:underline"
            >
              {activity.title}
            </Link>
          </>
        );
      case "SAVED_POST":
        return (
          <>
            You saved{" "}
            <Link 
              href={activity.metadata?.postSlug ? `/forum/${activity.metadata.postSlug}` : "/forum"}
              className="font-semibold text-primary hover:underline"
            >
              {activity.title}
            </Link>
          </>
        );
      case "SAVED_COMMENT":
        return (
          <>
            You saved a comment on{" "}
            <Link 
              href={activity.metadata?.postSlug ? `/forum/${activity.metadata.postSlug}` : "/forum"}
              className="font-semibold text-primary hover:underline"
            >
              {activity.title}
            </Link>
          </>
        );
      default:
        return null;
    }
  };

  const getActivityIcon = () => {
    switch (activity.type) {
      case "CREATED_FORUM_POST":
        return <MessageSquare className="h-4 w-4" />;
      case "CREATED_FORUM_REPLY":
        return <MessageSquare className="h-4 w-4" />;
      case "DRAFT_POST":
        return <FileText className="h-4 w-4" />;
      case "UPVOTED_POST":
        return <ArrowUp className="h-4 w-4" />;
      case "DOWNVOTED_POST":
        return <ArrowDown className="h-4 w-4" />;
      case "SAVED_POST":
        return <Bookmark className="h-4 w-4" />;
      case "SAVED_COMMENT":
        return <Bookmark className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const avatarUrl = isCurrentUser && contextAvatarUrl 
    ? contextAvatarUrl 
    : activity.user.avatarUrl || undefined;
  const initials = (activity.user.username || activity.user.displayName || "U")[0].toUpperCase();

  return (
    <div className="flex gap-4 p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={avatarUrl} alt="You" />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getActivityIcon()}
              <p className="text-sm text-foreground">
                {getActivityMessage()}
              </p>
            </div>
            {activity.metadata?.categoryName && (
              <Badge variant="outline" className="mt-2 text-xs">
                {activity.metadata.categoryName}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 25;

export function ForumActivityContent() {
  const [selectedType, setSelectedType] = useState<"all" | "posts" | "replies" | "drafts" | "upvotes" | "downvotes" | "saved_posts" | "saved_comments">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [groupBy, setGroupBy] = useState<"none" | "day" | "week" | "month">("none");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => {
      const response = await fetch("/api/forum/categories");
      if (!response.ok) {
        return { categories: [] };
      }
      return response.json();
    },
  });

  const categories = categoriesData?.categories || [];

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

  // Fetch activities from new API
  const { data, isLoading } = useQuery<{ activities: Activity[]; total: number }>({
    queryKey: ["forum-my-activity", selectedType, categoryFilter, sortOrder, startDate, endDate, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "100",
        sortOrder,
      });
      
      if (selectedType !== "all") {
        params.append("type", selectedType);
      }
      
      if (categoryFilter !== "all") {
        params.append("categoryId", categoryFilter);
      }
      
      if (startDate) {
        params.append("startDate", startDate);
      }
      
      if (endDate) {
        params.append("endDate", endDate);
      }
      
      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      const response = await fetch(`/api/forum/activity/my-activity?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch forum activity");
      }
      return response.json();
    },
  });

  const allActivities = useMemo(() => {
    return data?.activities || [];
  }, [data?.activities]);

  // Group activities by date if groupBy is enabled
  const grouped = useMemo(() => {
    if (groupBy === "none") return null;

    const groupedActivities: Record<string, Activity[]> = {};

    allActivities.forEach((activity) => {
      const date = new Date(activity.createdAt);
      let key: string;

      if (groupBy === "day") {
        key = format(date, "yyyy-MM-dd");
      } else if (groupBy === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Week of ${format(weekStart, "MMM d, yyyy")}`;
      } else if (groupBy === "month") {
        key = format(date, "yyyy-MM");
      } else {
        return;
      }

      if (!groupedActivities[key]) {
        groupedActivities[key] = [];
      }
      groupedActivities[key].push(activity);
    });

    return groupedActivities;
  }, [allActivities, groupBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, categoryFilter, debouncedSearch, dateRange, sortOrder, groupBy]);

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
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      
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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedType !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (dateRange !== "all") count++;
    if (groupBy !== "none") count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedType, categoryFilter, dateRange, groupBy, searchQuery]);

  const clearFilters = () => {
    setSelectedType("all");
    setCategoryFilter("all");
    setDateRange("all");
    setGroupBy("none");
    setSearchQuery("");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex justify-start">
          <div className="w-full sm:w-auto sm:flex-shrink-0">
            <FilterSearchBar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search activities..."
              searchMaxWidth="sm:max-w-[25rem]"
              sortOrder={sortOrder}
              onSortChange={setSortOrder}
              justifyEnd={false}
              filters={[
                {
                  label: "Type",
                  value: selectedType,
                  options: [
                    { value: "all", label: "All", icon: <MessageSquare className="h-4 w-4" /> },
                    { value: "posts", label: "Posts", icon: <MessageSquare className="h-4 w-4" /> },
                    { value: "replies", label: "Replies", icon: <MessageSquare className="h-4 w-4" /> },
                    { value: "drafts", label: "Drafts", icon: <FileText className="h-4 w-4" /> },
                    { value: "upvotes", label: "Upvotes", icon: <ArrowUp className="h-4 w-4" /> },
                    { value: "downvotes", label: "Downvotes", icon: <ArrowDown className="h-4 w-4" /> },
                    { value: "saved_posts", label: "Saved Posts", icon: <Bookmark className="h-4 w-4" /> },
                    { value: "saved_comments", label: "Saved Comments", icon: <Bookmark className="h-4 w-4" /> },
                  ],
                  onValueChange: (value) => setSelectedType(value as typeof selectedType),
                },
                {
                  label: "Category",
                  value: categoryFilter,
                  options: [
                    { value: "all", label: "All Categories" },
                    ...categories.map((cat: any) => ({
                      value: cat.id,
                      label: cat.name,
                    })),
                  ],
                  onValueChange: (value) => setCategoryFilter(value),
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
              hasActiveFilters={activeFilterCount > 0}
              onClearAll={clearFilters}
            />
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {dateRange === "custom" && (
          <div className="w-full mt-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
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
              </div>
            ))}
          </div>
        ) : totalItems === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              {debouncedSearch
                ? "No activities found matching your search."
                : activeFilterCount > 0
                ? "No activities found matching your filters. Try adjusting your filters."
                : "No forum activity yet. Start creating posts and replies!"}
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
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              ))}
          </div>
        ) : (
          <div className="divide-y">
            {paginatedActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
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
                className="flex-shrink-0 cursor-pointer"
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
                      className="min-w-[40px] flex-shrink-0 cursor-pointer"
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
                className="flex-shrink-0 cursor-pointer"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

