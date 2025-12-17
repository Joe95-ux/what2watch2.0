"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, ArrowUpDown } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ForumUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  joinDate: string;
  postCount: number;
  replyCount: number;
  reputation: number;
  lastActivity: string;
}

interface ForumUsersResponse {
  users: ForumUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ForumUsersContentProps {
  initialSearch?: string;
  initialSortBy?: "reputation" | "posts" | "replies" | "joinDate" | "lastActive";
  initialSortOrder?: "asc" | "desc";
}

function ForumUsersContentInner({
  initialSearch = "",
  initialSortBy = "reputation",
  initialSortOrder = "desc",
}: ForumUsersContentProps) {
  const router = useRouter();
  const observerTarget = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<"reputation" | "posts" | "replies" | "joinDate" | "lastActive">(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);

  // Fetch users with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<ForumUsersResponse, Error, InfiniteData<ForumUsersResponse>, readonly unknown[], number>({
    queryKey: ["forum-users", searchQuery, sortBy, sortOrder],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: "30",
        sortBy,
        order: sortOrder,
      });
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(`/api/forum/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch forum users");
      }
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all users from all pages
  const allUsers = data?.pages.flatMap((page: ForumUsersResponse) => page.users) ?? [];

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (sortBy !== "reputation") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("order", sortOrder);

    router.replace(`/forum/users?${params.toString()}`, { scroll: false });
  }, [searchQuery, sortBy, sortOrder, router]);

  const handleSortChange = (field: typeof sortBy, order: typeof sortOrder) => {
    setSortBy(field);
    setSortOrder(order);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Forum Users</h1>
        <p className="text-sm text-muted-foreground">
          Browse and search forum members
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80 2xl:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
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
                      sortBy !== "reputation" && "bg-primary/10 text-primary"
                    )}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleSortChange("reputation", "desc")}
                    className={cn(
                      "cursor-pointer",
                      sortBy === "reputation" && sortOrder === "desc" && "bg-accent"
                    )}
                  >
                    Highest Reputation
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSortChange("reputation", "asc")}
                    className={cn(
                      "cursor-pointer",
                      sortBy === "reputation" && sortOrder === "asc" && "bg-accent"
                    )}
                  >
                    Lowest Reputation
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSortChange("posts", "desc")}
                    className={cn(
                      "cursor-pointer",
                      sortBy === "posts" && sortOrder === "desc" && "bg-accent"
                    )}
                  >
                    Most Posts
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSortChange("replies", "desc")}
                    className={cn(
                      "cursor-pointer",
                      sortBy === "replies" && sortOrder === "desc" && "bg-accent"
                    )}
                  >
                    Most Replies
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSortChange("joinDate", "desc")}
                    className={cn(
                      "cursor-pointer",
                      sortBy === "joinDate" && sortOrder === "desc" && "bg-accent"
                    )}
                  >
                    Newest Members
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSortChange("joinDate", "asc")}
                    className={cn(
                      "cursor-pointer",
                      sortBy === "joinDate" && sortOrder === "asc" && "bg-accent"
                    )}
                  >
                    Oldest Members
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSortChange("lastActive", "desc")}
                    className={cn(
                      "cursor-pointer",
                      sortBy === "lastActive" && sortOrder === "desc" && "bg-accent"
                    )}
                  >
                    Most Recent Activity
                  </DropdownMenuItem>
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
          <p className="text-destructive">Failed to load users. Please try again.</p>
        </div>
      ) : allUsers.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <>
          <div className="border-t border-b border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-b hover:bg-transparent">
                  <TableHead className="w-[30%] font-semibold">User</TableHead>
                  <TableHead className="w-[15%] text-right font-semibold">Join Date</TableHead>
                  <TableHead className="w-[12%] text-right font-semibold">Posts</TableHead>
                  <TableHead className="w-[12%] text-right font-semibold">Replies</TableHead>
                  <TableHead className="w-[15%] text-right font-semibold">Reputation</TableHead>
                  <TableHead className="w-[16%] text-right font-semibold">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((user: ForumUser) => (
                  <TableRow key={user.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <TableCell>
                      <Link
                        href={`/users/${user.username || user.id}`}
                        className="flex items-center gap-3 hover:underline cursor-pointer"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback>
                            {getInitials(user.displayName || user.username || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.displayName || user.username || "Anonymous"}
                          </div>
                          {user.username && user.displayName && (
                            <div className="text-sm text-muted-foreground">@{user.username}</div>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.joinDate), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm">{user.postCount}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm">{user.replyCount}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-medium">{user.reputation}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Observer target for infinite scroll */}
          <div ref={observerTarget} className="h-4" />
          
          {/* Loading indicator when fetching next page */}
          {isFetchingNextPage && (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ForumUsersContent(props: ForumUsersContentProps) {
  return <ForumUsersContentInner {...props} />;
}

