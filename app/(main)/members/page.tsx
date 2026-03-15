"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Search, UsersRound, ArrowUpDown, Filter, LayoutGrid, List, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MemberCardCompact } from "@/components/members/member-card-compact";
import { MemberCardList } from "@/components/members/member-card-list";
import { MemberCardCompactSkeleton, MemberCardListSkeleton } from "@/components/members/member-card-skeletons";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "followers" | "lists" | "name";
type FilterOption = "all" | "hasLists" | "following" | "favorites";

type ViewMode = "compact" | "list";

interface User {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  bannerUrl?: string | null;
  bannerGradientId?: string | null;
  followersCount: number;
  followingCount: number;
  listsCount: number;
  watchedCount?: number;
  likedCount?: number;
  reviewsCount?: number;
  allListsCount?: number;
  isFollowing: boolean;
  isBookmarked?: boolean;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const fetchUsers = async (
  page: number,
  search: string,
  sort: SortOption,
  filter: FilterOption
): Promise<UsersResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: "24",
    sort,
    filter,
  });
  if (search) {
    params.append("search", search);
  }
  const response = await fetch(`/api/users?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
};

export default function MembersPage() {
  const { isSignedIn } = useUser();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("compact");

  const { data, isLoading, isError } = useQuery<UsersResponse>({
    queryKey: ["users", page, search, sort, filter],
    queryFn: () => fetchUsers(page, search, sort, filter),
  });

  const [bookmarkPendingId, setBookmarkPendingId] = useState<string | null>(null);

  const bookmarkMutation = useMutation({
    mutationFn: async ({ userId, bookmarked }: { userId: string; bookmarked: boolean }) => {
      const res = await fetch(`/api/users/${userId}/favorite`, {
        method: bookmarked ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update favorite");
      }
    },
    onMutate: ({ userId }) => {
      setBookmarkPendingId(userId);
    },
    onSuccess: (_, { bookmarked }) => {
      toast.success(bookmarked ? "Removed from favorites" : "Added to favorites");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update favorite");
    },
    onSettled: () => {
      setBookmarkPendingId(null);
    },
  });

  const handleBookmarkClick = useCallback(
    (userId: string) => {
      if (!isSignedIn) return;
      const user = data?.users?.find((u) => u.id === userId);
      const currentlyBookmarked = user?.isBookmarked ?? false;
      bookmarkMutation.mutate({ userId, bookmarked: currentlyBookmarked });
    },
    [isSignedIn, data?.users, bookmarkMutation]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSort(value as SortOption);
    setPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilter(value as FilterOption);
    setPage(1);
  };

  // When signed out, "following" and "favorites" filters are invalid; reset to "all"
  useEffect(() => {
    if (!isSignedIn && (filter === "following" || filter === "favorites")) {
      setFilter("all");
      setPage(1);
    }
  }, [isSignedIn, filter]);

  const users = data?.users || [];
  const pagination = data?.pagination;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <UsersRound className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        </div>
        <p className="text-muted-foreground">
          Discover and connect with other film enthusiasts
        </p>
      </div>

      {/* Search bar with sort, filter, and view toggle tucked in */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="relative flex items-center rounded-lg border bg-background">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none shrink-0" />
          <Input
            type="text"
            placeholder="Search members..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-4 h-10 min-w-0 flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="flex items-center gap-0.5 pr-2 shrink-0">
            {searchInput && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => setSearchInput("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 cursor-pointer",
                    sort !== "newest" && "text-primary"
                  )}
                  aria-label="Sort by"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSortChange("newest")} className={cn("cursor-pointer", sort === "newest" && "bg-accent")}>
                  Newest first
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("followers")} className={cn("cursor-pointer", sort === "followers" && "bg-accent")}>
                  Most followers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("lists")} className={cn("cursor-pointer", sort === "lists" && "bg-accent")}>
                  Most lists
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("name")} className={cn("cursor-pointer", sort === "name" && "bg-accent")}>
                  Name A–Z
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 cursor-pointer",
                    filter !== "all" && "text-primary"
                  )}
                  aria-label="Filter"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleFilterChange("all")} className={cn("cursor-pointer", filter === "all" && "bg-accent")}>
                  All members
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange("hasLists")} className={cn("cursor-pointer", filter === "hasLists" && "bg-accent")}>
                  With public lists
                </DropdownMenuItem>
                {isSignedIn && (
                  <>
                    <DropdownMenuItem onClick={() => handleFilterChange("following")} className={cn("cursor-pointer", filter === "following" && "bg-accent")}>
                      Following
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFilterChange("favorites")} className={cn("cursor-pointer", filter === "favorites" && "bg-accent")}>
                      Favorites
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as ViewMode)}
              className="border-0 p-0 h-8 gap-0 rounded-md overflow-hidden"
              aria-label="View mode"
            >
              <ToggleGroupItem value="compact" aria-label="Compact view" className="h-8 w-8 rounded-none border-0 data-[state=on]:bg-muted cursor-pointer">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view" className="h-8 w-8 rounded-none border-0 data-[state=on]:bg-muted cursor-pointer">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </form>
      </div>

      {/* Users Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 12 }).map((_, i) =>
            viewMode === "compact" ? (
              <MemberCardCompactSkeleton key={i} />
            ) : (
              <MemberCardListSkeleton key={i} />
            )
          )}
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load members. Please try again.</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <UsersRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No members found</h3>
          <p className="text-muted-foreground">
            {search ? "Try a different search term" : "Be the first to join!"}
          </p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "mb-6",
              viewMode === "compact"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            )}
          >
            {users.map((user) =>
              viewMode === "compact" ? (
                <MemberCardCompact
                  key={user.id}
                  user={user}
                  currentUserId={currentUser?.id}
                  isSignedIn={!!isSignedIn}
                  isBookmarked={user.isBookmarked ?? false}
                  onBookmarkClick={handleBookmarkClick}
                  isBookmarkPending={bookmarkPendingId === user.id}
                />
              ) : (
                <MemberCardList
                  key={user.id}
                  user={user}
                  currentUserId={currentUser?.id}
                  isSignedIn={!!isSignedIn}
                  isBookmarked={user.isBookmarked ?? false}
                  onBookmarkClick={handleBookmarkClick}
                  isBookmarkPending={bookmarkPendingId === user.id}
                />
              )
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

