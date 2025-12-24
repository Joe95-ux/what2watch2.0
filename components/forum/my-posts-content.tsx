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
import { ForumActivityContent } from "@/components/forum/forum-activity-content";
import { ForumNotificationsTab } from "@/components/notifications/forum-notifications-tab";
import { ForumSummaryContent } from "@/components/forum/forum-summary-content";
import { CreatePostDialog } from "@/components/forum/create-post-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import { BANNER_GRADIENTS } from "@/components/social/banner-gradient-selector";

type TabType = "posts" | "activity" | "notifications" | "summary";
type StatusFilter = "all" | "published" | "scheduled" | "archived" | "private";
type SortField = "createdAt" | "views" | "replies" | "score";

interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  tags: string[];
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
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isScrolled: boolean;
  postCount: number;
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
        "sticky top-[65px] z-40 transition-all duration-300 border-b",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-border shadow-sm"
          : "bg-background border-border"
      )}
    >
      <div className="max-w-[70rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide scroll-smooth">
          {tabs.map((tab) => {
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
          })}
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

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setIsScrolled(rect.bottom < 100);
      }
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
        {/* Banner Skeleton */}
        <div className="relative h-[150px] max-w-[70rem] mx-auto sm:mt-[1rem] sm:mb-0 sm:rounded-[25px] overflow-hidden bg-muted">
          <Skeleton className="w-full h-full" />
        </div>

        {/* Profile Info Skeleton */}
        <div className="max-w-[70rem] mx-auto px-4 sm:px-6">
          <div className="relative -mt-16 sm:-mt-10 mb-4">
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Sticky Nav Skeleton */}
        <div className="sticky top-[65px] z-40 border-b bg-background/95 backdrop-blur-md">
          <div className="max-w-[70rem] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24" />
              ))}
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-[70rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Banner/Cover Section */}
      <div ref={heroRef} className="relative h-[150px] max-w-[70rem] mx-auto sm:mt-[1rem] sm:mb-0 sm:rounded-[25px] overflow-hidden">
        {bannerDisplay.type === "image" ? (
          <>
            <Image
              src={bannerDisplay.url}
              alt="Banner"
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />
          </>
        ) : (
          <>
            <div 
              className="w-full h-full" 
              style={{ background: bannerDisplay.gradient }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />
          </>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="max-w-[70rem] mx-auto px-4 sm:px-6">
        {/* Avatar */}
        <div className="relative -mt-16 sm:-mt-10 mb-4">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-3xl sm:text-4xl">{initials}</AvatarFallback>
          </Avatar>
        </div>

        {/* Profile Info and Create Post Button */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">{displayName}</h1>
            {username && (
              <p className="text-base sm:text-lg text-muted-foreground">@{username}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <Button onClick={() => setIsCreateDialogOpen(true)} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </div>
        </div>
      </div>
      
      <MyPostsStickyNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isScrolled={isScrolled}
        postCount={totalPosts}
      />

      <div className="max-w-[70rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "posts" && (
          <>
            {/* Post Count */}
            <div className="mb-6">
              <p className="text-muted-foreground">
                {totalPosts} {totalPosts === 1 ? "post" : "posts"}
                {activeFilterCount > 0 && (
                  <span className="ml-2">
                    <Badge variant="secondary" className="text-xs">
                      {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} active
                    </Badge>
                  </span>
                )}
              </p>
            </div>

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
                <div className="space-y-4 mt-6">
                  {posts.map((post: Post) => (
                    <div
                      key={post.id}
                      className="pb-4 border-b hover:bg-muted/30 transition-colors p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-2">
                            <Link
                              href={`/forum/${post.slug}`}
                              className="font-medium hover:text-primary transition-colors flex-1 min-w-0"
                            >
                              <h4 className="truncate">{post.title}</h4>
                            </Link>
                            {/* Status badge - visible on sm+ screens */}
                            <div className="hidden sm:block flex-shrink-0">
                              {getStatusBadge(post.status, post.scheduledAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                            {post.category && (
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
                              >
                                {post.category.name}
                              </span>
                            )}
                            <span>{post.replyCount} replies</span>
                            <span>{post.score} score</span>
                            <span>{post.views} views</span>
                            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                          </div>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                {post.tags.slice(0, 5).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              {/* Status badge - visible on < sm screens, on same row as tags */}
                              <div className="sm:hidden flex-shrink-0">
                                {getStatusBadge(post.status, post.scheduledAt)}
                              </div>
                            </div>
                          )}
                          {/* If no tags, show status badge on its own row on small screens */}
                          {(!post.tags || post.tags.length === 0) && (
                            <div className="sm:hidden mt-2">
                              {getStatusBadge(post.status, post.scheduledAt)}
                            </div>
                          )}
                        </div>
                        {/* Action buttons - visible on sm+ screens */}
                        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/forum/${post.slug}`);
                            }}
                            className="h-8 w-8 cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/forum/${post.slug}?edit=true`);
                            }}
                            className="h-8 w-8 cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteClick(post);
                            }}
                            className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Dropdown menu - visible on < sm screens */}
                        <div className="sm:hidden flex-shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  router.push(`/forum/${post.slug}`);
                                }}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  router.push(`/forum/${post.slug}?edit=true`);
                                }}
                                className="cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteClick(post);
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
                  ))}
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
    </div>
  );
}

