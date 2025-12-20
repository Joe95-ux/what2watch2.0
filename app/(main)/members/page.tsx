"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";

interface User {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  listsCount: number;
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

const fetchUsers = async (page: number, search: string): Promise<UsersResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: "24",
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

  const { data, isLoading, isError } = useQuery<UsersResponse>({
    queryKey: ["users", page, search],
    queryFn: () => fetchUsers(page, search),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

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

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-md">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {users.map((user) => {
              const displayName = user.username || user.displayName || "Unknown";
              const username = user.username || user.id.slice(0, 8);
              const initials = displayName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={user.id}
                  className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Link href={`/users/${user.id}`}>
                      <Avatar className="h-12 w-12 cursor-pointer">
                        <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/users/${user.id}`}>
                        <h3 className="font-semibold hover:underline truncate">{displayName}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">@{username}</p>
                    </div>
                  </div>

                  {user.bio && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {user.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span>{user.followersCount} followers</span>
                    <span>•</span>
                    <span>{user.listsCount} lists</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Link href={`/users/${user.id}`}>
                        View Profile
                      </Link>
                    </Button>
                    {isSignedIn && currentUser?.id !== user.id && (
                      <FollowButton userId={user.id} size="sm" variant="default" />
                    )}
                  </div>
                </div>
              );
            })}
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

