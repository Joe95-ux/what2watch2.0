"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { Search, Users, ArrowUpDown, Filter, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MemberCardCompact } from "@/components/members/member-card-compact";
import { MemberCardList } from "@/components/members/member-card-list";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "followers" | "lists" | "name";
type FilterOption = "all" | "hasLists" | "following";

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
  watchlistCount?: number;
  likedCount?: number;
  allListsCount?: number;
  isFollowing: boolean;
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

  // When signed out, "following" filter is invalid; reset to "all"
  useEffect(() => {
    if (!isSignedIn && filter === "following") {
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
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        </div>
        <p className="text-muted-foreground">
          Discover and connect with other film enthusiasts
        </p>
      </div>

      {/* Search + Sort + Filter + View toggle */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search members..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="border rounded-md p-0.5 bg-muted/30"
            aria-label="View mode"
          >
            <ToggleGroupItem
              value="compact"
              aria-label="Compact view"
              className="gap-1.5 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Compact</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="List view"
              className="gap-1.5 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">List</span>
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[160px] gap-2" aria-label="Sort by">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="followers">Most followers</SelectItem>
              <SelectItem value="lists">Most lists</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[140px] gap-2" aria-label="Filter">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              <SelectItem value="hasLists">With public lists</SelectItem>
              {isSignedIn && (
                <SelectItem value="following">Following</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load members. Please try again.</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                />
              ) : (
                <MemberCardList
                  key={user.id}
                  user={user}
                  currentUserId={currentUser?.id}
                  isSignedIn={!!isSignedIn}
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

