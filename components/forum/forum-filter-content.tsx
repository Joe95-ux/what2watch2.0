"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ForumSidebar } from "./forum-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelLeft, Search, X, ArrowUpDown, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SimplePagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ForumPost {
  id: string;
  slug?: string;
  title: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    icon?: string | null;
  } | null;
  views: number;
  replyCount: number;
  contributors?: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }>;
  lastActivity?: string;
  updatedAt: string;
}

interface ForumPostsResponse {
  posts: ForumPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function ForumFilterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [sortBy, setSortBy] = useState<"createdAt" | "views" | "replyCount" | "updatedAt">(
    (searchParams.get("sortBy") as any) || "updatedAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("order") as any) || "desc"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get("category") || "all"
  );

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => {
      const response = await fetch("/api/forum/categories");
      if (!response.ok) return { categories: [] };
      return response.json();
    },
  });

  // Fetch posts
  const { data, isLoading, error } = useQuery<ForumPostsResponse>({
    queryKey: ["forum-posts-filter", currentPage, searchQuery, sortBy, sortOrder, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
        sortBy,
        order: sortOrder,
      });
      if (searchQuery) params.set("search", searchQuery);
      if (categoryFilter && categoryFilter !== "all") {
        params.set("category", categoryFilter);
      }

      const response = await fetch(`/api/forum/posts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch forum posts");
      }
      return response.json();
    },
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (sortBy !== "updatedAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("order", sortOrder);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (currentPage > 1) params.set("page", currentPage.toString());

    router.replace(`/forum/filter?${params.toString()}`, { scroll: false });
  }, [searchQuery, sortBy, sortOrder, categoryFilter, currentPage, router]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder, categoryFilter]);

  const handleSortChange = (field: typeof sortBy, order: typeof sortOrder) => {
    setSortBy(field);
    setSortOrder(order);
  };

  const getCategoryColor = (color?: string | null) => {
    if (!color) return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    
    const colorMap: Record<string, string> = {
      "#3B82F6": "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      "#10B981": "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
      "#F59E0B": "bg-amber-500/20 text-amber-700 dark:text-amber-400",
      "#EF4444": "bg-red-500/20 text-red-700 dark:text-red-400",
      "#8B5CF6": "bg-violet-500/20 text-violet-700 dark:text-violet-400",
      "#EC4899": "bg-pink-500/20 text-pink-700 dark:text-pink-400",
      "#06B6D4": "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
      "#84CC16": "bg-lime-500/20 text-lime-700 dark:text-lime-400",
      "#F97316": "bg-orange-500/20 text-orange-700 dark:text-orange-400",
      "#A855F7": "bg-purple-500/20 text-purple-700 dark:text-purple-400",
    };
    
    return colorMap[color] || `bg-[${color}]/20 text-[${color}]`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <ForumSidebar 
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Sidebar Trigger */}
        {isMobile && (
          <div className="sticky top-[65px] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-4 py-2 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="cursor-pointer h-9 w-9"
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
              <div className="h-4 w-px bg-border flex-shrink-0" />
              <h1 className="text-sm font-semibold">Filter Forum</h1>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Filter Forum</h1>
            <p className="text-sm text-muted-foreground">
              Search and filter forum posts
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-80 2xl:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0">
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}

                  {/* Sort Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 cursor-pointer",
                          sortBy !== "updatedAt" && "bg-primary/10 text-primary"
                        )}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleSortChange("updatedAt", "desc")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "updatedAt" && sortOrder === "desc" && "bg-accent"
                        )}
                      >
                        Recent Activity
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSortChange("updatedAt", "asc")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "updatedAt" && sortOrder === "asc" && "bg-accent"
                        )}
                      >
                        Oldest Activity
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSortChange("createdAt", "desc")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "createdAt" && sortOrder === "desc" && "bg-accent"
                        )}
                      >
                        Newest First
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSortChange("createdAt", "asc")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "createdAt" && sortOrder === "asc" && "bg-accent"
                        )}
                      >
                        Oldest First
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSortChange("views", "desc")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "views" && sortOrder === "desc" && "bg-accent"
                        )}
                      >
                        Most Viewed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSortChange("replyCount", "desc")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "replyCount" && sortOrder === "desc" && "bg-accent"
                        )}
                      >
                        Most Replies
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Filter Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 cursor-pointer",
                          categoryFilter !== "all" && "bg-primary/10 text-primary"
                        )}
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setCategoryFilter("all")}
                        className={cn(
                          "cursor-pointer",
                          categoryFilter === "all" && "bg-accent"
                        )}
                      >
                        All Categories
                      </DropdownMenuItem>
                      {categoriesData?.categories?.map((category: any) => (
                        <DropdownMenuItem
                          key={category.id}
                          onClick={() => setCategoryFilter(category.slug)}
                          className={cn(
                            "cursor-pointer",
                            categoryFilter === category.slug && "bg-accent"
                          )}
                        >
                          {category.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Failed to load posts. Please try again.</p>
            </div>
          ) : !data || data.posts.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No posts found</p>
            </div>
          ) : (
            <>
              <div className="border-t border-b border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b hover:bg-transparent">
                      <TableHead className="w-[40%] font-semibold">Topic</TableHead>
                      <TableHead className="w-[20%] font-semibold">Contributors</TableHead>
                      <TableHead className="w-[10%] text-right font-semibold">Replies</TableHead>
                      <TableHead className="w-[10%] text-right font-semibold">Views</TableHead>
                      <TableHead className="w-[20%] font-semibold">Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.posts.map((post) => (
                      <TableRow key={post.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <TableCell>
                          <div className="space-y-1">
                            <Link
                              href={`/forum/${post.slug || post.id}`}
                              className="font-medium hover:underline cursor-pointer block"
                            >
                              {post.title}
                            </Link>
                            {post.category && (
                              <div>
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    getCategoryColor(post.category.color)
                                  )}
                                  style={post.category.color ? {
                                    backgroundColor: `${post.category.color}20`,
                                    color: post.category.color,
                                  } : undefined}
                                >
                                  {post.category.icon && (
                                    <span className="mr-1">{post.category.icon}</span>
                                  )}
                                  {post.category.name}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center -space-x-2">
                            {post.contributors && post.contributors.length > 0 ? (
                              <>
                                {post.contributors.slice(0, 5).map((contributor, idx) => (
                                  <Avatar
                                    key={contributor.id}
                                    className="h-8 w-8 border-2 border-background"
                                    style={{ zIndex: 5 - idx }}
                                  >
                                    <AvatarImage src={contributor.avatarUrl} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(contributor.displayName || contributor.username)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {post.contributors.length > 5 && (
                                  <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                                    +{post.contributors.length - 5}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm">{post.replyCount}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm">{post.views}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {post.lastActivity
                              ? formatDistanceToNow(new Date(post.lastActivity), { addSuffix: true })
                              : formatDistanceToNow(new Date(post.updatedAt), { addSuffix: true })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="mt-6">
                  <SimplePagination
                    currentPage={currentPage}
                    totalPages={data.pagination.totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

