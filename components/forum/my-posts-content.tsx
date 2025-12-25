"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Activity, 
  Bell, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Archive, 
  Clock,
  Lock,
  Globe,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  BarChart3,
  TrendingUp,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterSearchBar, FilterRow } from "@/components/ui/filter-search-bar";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditPostDialog } from "@/components/forum/edit-post-dialog";
import { ForumActivityContent } from "@/components/forum/forum-activity-content";
import { ForumNotificationsTab } from "@/components/notifications/forum-notifications-tab";
import { ForumSummaryContent } from "@/components/forum/forum-summary-content";
import { CreatePostDialog } from "@/components/forum/create-post-dialog";
import { ForumPostCardReddit } from "@/components/forum/forum-post-card-reddit";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import { BANNER_GRADIENTS } from "@/components/social/banner-gradient-selector";
import { useForumBadges } from "@/hooks/use-forum-badges";
import BannerSelector from "@/components/social/banner-selector";
import { Camera, UsersRound, Trophy } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type TabType = "posts" | "activity" | "notifications" | "summary";
type StatusFilter = "all" | "published" | "scheduled" | "archived" | "private";
type SortField = "createdAt" | "views" | "replies" | "score";

interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  tags: string[];
  metadata?: Record<string, any> | null;
  tmdbId?: number;
  mediaType?: string;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string;
    icon?: string;
  } | null;
  views: number;
  score: number;
  replyCount: number;
  status: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

function MyPostsStickyNav({
  activeTab,
  onTabChange,
  isScrolled,
  postCount,
  isLoading,
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isScrolled: boolean;
  postCount: number;
  isLoading?: boolean;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeTabRef.current && navRef.current) {
      const nav = navRef.current;
      const activeButton = activeTabRef.current;
      const navRect = nav.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      const isOutOfViewLeft = buttonRect.left < navRect.left;
      const isOutOfViewRight = buttonRect.right > navRect.right;
      
      if (isOutOfViewLeft || isOutOfViewRight) {
        activeButton.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeTab]);

  const tabs = [
    { id: "posts" as TabType, label: "Posts", icon: MessageSquare, count: postCount },
    { id: "activity" as TabType, label: "Activity", icon: Activity },
    { id: "notifications" as TabType, label: "Notifications", icon: Bell },
    { id: "summary" as TabType, label: "Summary", icon: BarChart3 },
  ];

  return (
    <div
      ref={navRef}
      className={cn(
        "sticky top-[65px] z-40 transition-all duration-300 border-b mx-4 sm:mx-6 lg:mx-8",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-border shadow-sm"
          : "bg-background border-border"
      )}
    >
      <div>
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide scroll-smooth">
          {isLoading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-16 flex-shrink-0" />
              ))}
            </>
          ) : (
            tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={isActive ? activeTabRef : null}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "relative py-4 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 flex-shrink-0",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {tab.count}
                    </Badge>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyPostsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const heroRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Get current user data
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);

  // Calculate display name and initials
  const displayName = currentUser?.displayName || currentUser?.username || "User";
  const username = currentUser?.username || "";
  const initials = (currentUser?.username || "U")[0].toUpperCase();
  const avatarUrl = contextAvatarUrl || currentUser?.avatarUrl || undefined;

  // Get banner display
  const bannerDisplay = useMemo(() => {
    if (!currentUser) {
      return { type: "gradient" as const, gradient: "#061E1C" };
    }
    if (currentUser.bannerUrl) {
      return { type: "image" as const, url: currentUser.bannerUrl };
    }
    const gradient = BANNER_GRADIENTS.find((g) => g.id === (currentUser.bannerGradientId || "gradient-1"));
    return { type: "gradient" as const, gradient: gradient?.gradient || "#061E1C" };
  }, [currentUser?.bannerUrl, currentUser?.bannerGradientId, currentUser]);

  // Fetch follower count
  const { data: followersData } = useQuery<{ followersCount: number }>({
    queryKey: ["user", currentUser?.id, "followers-count"],
    queryFn: async () => {
      if (!currentUser?.id) return { followersCount: 0 };
      const response = await fetch(`/api/users/${currentUser.id}/profile`);
      if (!response.ok) return { followersCount: 0 };
      const data = await response.json();
      return { followersCount: data.user?.followersCount || 0 };
    },
    enabled: !!currentUser?.id,
    staleTime: 60 * 1000, // 1 minute
  });
  const followersCount = followersData?.followersCount || 0;

  // Fetch badges
  const { data: badgesData } = useForumBadges(currentUser?.id || null);
  const userBadges = badgesData?.userBadges || [];

  // Fetch stats for sidebar
  const { data: statsData } = useQuery<{ stats: any }>({
    queryKey: ["forum-my-stats"],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not found");
      }
      const response = await fetch(`/api/forum/stats/my-stats`);
      if (!response.ok) {
        throw new Error("Failed to fetch forum stats");
      }
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  const stats = statsData?.stats;

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  // Fetch posts
  const { data: postsData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["my-posts", currentPage, statusFilter, categoryFilter, searchQuery, sortField, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        status: statusFilter,
        sortBy: sortField,
        order: sortOrder,
      });
      
      if (categoryFilter !== "all") {
        params.append("categoryId", categoryFilter);
      }
      
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const response = await fetch(`/api/forum/posts/my-posts?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      return response.json();
    },
    enabled: activeTab === "posts",
  });

  const posts = postsData?.posts || [];
  const totalPosts = postsData?.pagination?.total || 0;
  const totalPages = postsData?.pagination?.totalPages || 1;

  // Delete post mutation
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/forum/posts/${postId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete post");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-posts"] });
      toast.success("Post deleted successfully");
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete post");
    },
  });

  const handleDeleteClick = (post: Post) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;
    await deletePost.mutateAsync(postToDelete.id);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (statusFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    return count;
  }, [searchQuery, statusFilter, categoryFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoryFilter, searchQuery, sortField, sortOrder]);

  const getStatusBadge = (status: string, scheduledAt?: string) => {
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      return (
        <Badge variant="outline" className="gap-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
          <Clock className="h-3 w-3" />
          Scheduled
        </Badge>
      );
    }
    switch (status) {
      case "PUBLIC":
        return (
          <Badge variant="outline" className="gap-1 bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
            <Globe className="h-3 w-3" />
            Published
          </Badge>
        );
      case "PRIVATE":
        return (
          <Badge variant="outline" className="gap-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
            <Lock className="h-3 w-3" />
            Private
          </Badge>
        );
      case "ARCHIVED":
        return (
          <Badge variant="outline" className="gap-1 bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30">
            <Archive className="h-3 w-3" />
            Archived
          </Badge>
        );
      default:
        return null;
    }
  };

  // Loading skeleton
  if (isLoadingUser) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column */}
            <div className="flex-1 min-w-0">
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 py-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-28" />
                </div>
              </div>
              <MyPostsStickyNav
                activeTab="posts"
                onTabChange={() => {}}
                isScrolled={false}
                postCount={0}
                isLoading={true}
              />
              <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
            {/* Right Sidebar */}
            <aside className="w-full lg:w-80 flex-shrink-0">
              <div className="rounded-lg border border-border bg-background">
                <Skeleton className="h-[77px] w-full rounded-t-lg" />
                <div className="p-4 border-b">
                  <Skeleton className="h-5 w-32 mx-auto mb-2" />
                  <Skeleton className="h-4 w-24 mx-auto mb-2" />
                  <Skeleton className="h-4 w-28 mx-auto" />
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // Top 4 stats for sidebar
  const topStats = stats ? [
    { label: "Total Posts", value: stats.postCount, icon: <MessageSquare className="h-5 w-5 text-blue-500" /> },
    { label: "Total Views", value: stats.totalViews, icon: <Eye className="h-5 w-5 text-purple-500" /> },
    { label: "Total Score", value: stats.totalScore, icon: <TrendingUp className="h-5 w-5 text-amber-500" /> },
    { label: "Upvotes", value: stats.totalUpvotes, icon: <ArrowUp className="h-5 w-5 text-emerald-500" /> },
  ] : [];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Column */}
          <div className="flex-1 min-w-0">
            {/* Header with Avatar, Username, Display Name aligned with sticky nav */}
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 py-4">
                <Avatar className="h-10 w-10 border-2 border-background">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-semibold truncate">{displayName}</h1>
                  {username && (
                    <p className="text-xs text-muted-foreground truncate">@{username}</p>
                  )}
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="cursor-pointer" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              </div>
            </div>

            <MyPostsStickyNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isScrolled={isScrolled}
              postCount={totalPosts}
              isLoading={isLoadingUser}
            />

            <div className="px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "posts" && (
          <>
            {/* Active Filters Badge */}
            {activeFilterCount > 0 && (
              <div className="mb-6">
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} active
                </Badge>
              </div>
            )}

            {/* Search and Filters */}
            <div className="mb-5">
              <FilterSearchBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search posts by title or content..."
                searchMaxWidth="sm:max-w-[25rem]"
                sortOrder={sortOrder}
                onSortChange={setSortOrder}
                filters={[
                  {
                    label: "Status",
                    value: statusFilter,
                    options: [
                      { value: "all", label: "All Status" },
                      { value: "published", label: "Published", icon: <Globe className="h-4 w-4" /> },
                      { value: "scheduled", label: "Scheduled", icon: <Clock className="h-4 w-4" /> },
                      { value: "private", label: "Private", icon: <Lock className="h-4 w-4" /> },
                      { value: "archived", label: "Archived", icon: <Archive className="h-4 w-4" /> },
                    ],
                    onValueChange: (value) => setStatusFilter(value as StatusFilter),
                  },
                  ...(categories.length > 0
                    ? [
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
                          onValueChange: setCategoryFilter,
                        },
                      ]
                    : []),
                  {
                    label: "Sort By",
                    value: `${sortField}-${sortOrder}`,
                    options: [
                      { value: "createdAt-desc", label: "Newest First" },
                      { value: "createdAt-asc", label: "Oldest First" },
                      { value: "views-desc", label: "Most Views" },
                      { value: "views-asc", label: "Least Views" },
                      { value: "replies-desc", label: "Most Replies" },
                      { value: "replies-asc", label: "Least Replies" },
                      { value: "score-desc", label: "Highest Score" },
                      { value: "score-asc", label: "Lowest Score" },
                    ],
                    onValueChange: (value) => {
                      const [field, order] = value.split("-");
                      setSortField(field as SortField);
                      setSortOrder(order as "asc" | "desc");
                    },
                  },
                ]}
                hasActiveFilters={activeFilterCount > 0}
                onClearAll={clearFilters}
                renderFilterRowOutside={true}
                onFilterRowStateChange={setIsFilterRowOpen}
              />
            </div>

            {/* Filter Row - Rendered outside */}
            <FilterRow
              filters={[
                {
                  label: "Status",
                  value: statusFilter,
                  options: [
                    { value: "all", label: "All Status" },
                    { value: "published", label: "Published", icon: <Globe className="h-4 w-4" /> },
                    { value: "scheduled", label: "Scheduled", icon: <Clock className="h-4 w-4" /> },
                    { value: "private", label: "Private", icon: <Lock className="h-4 w-4" /> },
                    { value: "archived", label: "Archived", icon: <Archive className="h-4 w-4" /> },
                  ],
                  onValueChange: (value) => setStatusFilter(value as StatusFilter),
                },
                ...(categories.length > 0
                  ? [
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
                        onValueChange: setCategoryFilter,
                      },
                    ]
                  : []),
                {
                  label: "Sort By",
                  value: `${sortField}-${sortOrder}`,
                  options: [
                    { value: "createdAt-desc", label: "Newest First" },
                    { value: "createdAt-asc", label: "Oldest First" },
                    { value: "views-desc", label: "Most Views" },
                    { value: "views-asc", label: "Least Views" },
                    { value: "replies-desc", label: "Most Replies" },
                    { value: "replies-asc", label: "Least Replies" },
                    { value: "score-desc", label: "Highest Score" },
                    { value: "score-asc", label: "Lowest Score" },
                  ],
                  onValueChange: (value) => {
                    const [field, order] = value.split("-");
                    setSortField(field as SortField);
                    setSortOrder(order as "asc" | "desc");
                  },
                },
              ]}
              openDropdowns={openDropdowns}
              setOpenDropdowns={setOpenDropdowns}
              toggleDropdown={(label) => {
                setOpenDropdowns((prev) => ({
                  ...prev,
                  [label]: !prev[label],
                }));
              }}
              getFilterDisplayValue={(filter) => {
                const option = filter.options.find((opt) => opt.value === filter.value);
                return option?.label || filter.value;
              }}
              handleFilterValueChange={(label, value, onValueChange) => {
                onValueChange(value);
                setOpenDropdowns((prev) => ({
                  ...prev,
                  [label]: false,
                }));
              }}
              onClearAll={clearFilters}
              hasActiveFilters={activeFilterCount > 0}
              isOpen={isFilterRowOpen}
            />

            {/* Posts List */}
            {isLoadingPosts ? (
              <div className="space-y-4 mt-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 mt-6">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {activeFilterCount > 0 ? "No posts match your filters" : "No posts yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {activeFilterCount > 0
                    ? "Try adjusting your filters to see more results."
                    : "Start creating posts to engage with the community."}
                </p>
                {activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={clearFilters} className="cursor-pointer">
                    Clear All Filters
                  </Button>
                ) : (
                  <Button onClick={() => router.push("/forum?create=true")} className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Post
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="mt-6 space-y-6">
                  {posts.map((post: Post) => {
                    // Convert Post to ForumPost format for ForumPostCardReddit
                    const forumPost = {
                      id: post.id,
                      slug: post.slug,
                      title: post.title,
                      content: post.content,
                      tags: post.tags,
                      metadata: post.metadata || null,
                      tmdbId: post.tmdbId,
                      mediaType: post.mediaType,
                      category: post.category,
                      views: post.views,
                      score: post.score,
                      replyCount: post.replyCount,
                      status: post.status,
                      author: {
                        id: currentUser?.id || "",
                        username: username || "",
                        displayName: displayName,
                        avatarUrl: avatarUrl || undefined,
                      },
                      createdAt: post.createdAt,
                      updatedAt: post.updatedAt,
                    };
                    return <ForumPostCardReddit key={post.id} post={forumPost} />;
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="cursor-pointer"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "activity" && (
          <ForumActivityContent />
        )}

        {activeTab === "notifications" && (
          <ForumNotificationsTab />
        )}

        {activeTab === "summary" && (
          <ForumSummaryContent />
        )}
            </div>
          </div>

          {/* Right Sidebar - Sticky */}
          <aside className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-[85px] self-start">
            <div className="rounded-lg border border-border bg-background">
              {/* Banner Section */}
              <div className="relative h-[77px] rounded-t-lg overflow-hidden">
                {bannerDisplay.type === "image" ? (
                  <Image
                    src={bannerDisplay.url}
                    alt="Banner"
                    fill
                    className="object-cover"
                    sizes="320px"
                    unoptimized
                  />
                ) : (
                  <div 
                    className="w-full h-full" 
                    style={{ background: bannerDisplay.gradient }}
                  />
                )}
                {/* Banner Modal Trigger - Small circular icon at bottom right */}
                <button
                  onClick={() => setIsEditBannerOpen(true)}
                  className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-background/90 hover:bg-background border border-border flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                >
                  <ImageIcon className="h-4 w-4 text-foreground" />
                </button>
              </div>

              {/* User Info */}
              <div className="p-4 border-b">
                <div className="text-center">
                  <h2 className="font-semibold text-lg">{displayName}</h2>
                  {username && (
                    <p className="text-sm text-muted-foreground">@{username}</p>
                  )}
                  <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <UsersRound className="h-4 w-4" />
                      <span>{followersCount} {followersCount === 1 ? "follower" : "followers"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              {stats && topStats.length > 0 && (
                <>
                  <div className="p-4 border-b">
                    <div className="grid grid-cols-2 divide-y divide-border">
                      {topStats.map((stat, index) => {
                        const columnsPerRow = 2;
                        const totalRows = Math.ceil(topStats.length / columnsPerRow);
                        const currentRow = Math.floor(index / columnsPerRow) + 1;
                        const isLastRow = currentRow === totalRows;
                        return (
                          <div 
                            key={stat.label} 
                            className={cn(
                              "p-4",
                              isLastRow && "border-b-0"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[15px] font-medium text-muted-foreground">
                                {stat.label}
                              </span>
                              {stat.icon}
                            </div>
                            <div className="text-xl font-bold">{stat.value.toLocaleString()}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Achievements/Badges */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Achievements</h3>
                    </div>
                    {userBadges.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {userBadges.slice(0, 6).map((userBadge) => (
                          <Tooltip key={userBadge.id}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted border border-border">
                                <span className="text-sm">{userBadge.badge.icon || "🏆"}</span>
                                <span className="text-xs font-medium">{userBadge.badge.name}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{userBadge.badge.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                        {userBadges.length > 6 && (
                          <div className="flex items-center justify-center px-2 py-1 rounded-md bg-muted border border-border">
                            <span className="text-xs font-medium">+{userBadges.length - 6}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No achievements yet</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{postToDelete?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Post Dialog */}
      <CreatePostDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      {/* Edit Post Dialog */}
      {editingPost && (
        <EditPostDialog
          isOpen={!!editingPost}
          onClose={() => {
            setEditingPost(null);
            // Refresh posts after editing
            queryClient.invalidateQueries({ queryKey: ["my-posts"] });
          }}
          post={{
            id: editingPost.id,
            slug: editingPost.slug,
            title: editingPost.title,
            content: editingPost.content,
            tags: editingPost.tags,
            metadata: editingPost.metadata || null,
            category: editingPost.category,
          }}
        />
      )}

      {/* Edit Banner Dialog */}
      <Dialog open={isEditBannerOpen} onOpenChange={setIsEditBannerOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>Change Banner</DialogTitle>
            <DialogDescription>
              Choose a gradient or upload your own banner image
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 min-h-0">
            <BannerSelector
              selectedGradient={currentUser?.bannerGradientId || undefined}
              selectedBannerUrl={currentUser?.bannerUrl}
              onSelect={async (data) => {
                try {
                  const response = await fetch("/api/user/banner", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      bannerUrl: data.bannerUrl,
                      bannerGradientId: data.gradientId,
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Failed to save banner");
                  }

                  await queryClient.invalidateQueries({ queryKey: ["current-user"] });
                  toast.success("Banner updated!");
                  setIsEditBannerOpen(false);
                } catch (error) {
                  console.error("Error updating banner:", error);
                  toast.error(error instanceof Error ? error.message : "Failed to update banner");
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

