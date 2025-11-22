"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { Users, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followersCount: number;
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

const fetchUsers = async (): Promise<UsersResponse> => {
  const response = await fetch(`/api/users?limit=10`);
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
};

export function MembersSidebar() {
  const { isSignedIn } = useUser();

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["users", "sidebar"],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const users = data?.users || [];

  return (
    <div className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-20 border rounded-lg p-4 bg-background">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" />
          <h2 className="font-semibold text-sm">Members</h2>
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)]">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No members yet
            </p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const displayName = user.displayName || user.username || "Unknown";
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
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Link href={`/users/${user.id}`} className="flex-shrink-0">
                      <Avatar className="h-10 w-10 cursor-pointer">
                        <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/users/${user.id}`}>
                        <p className="text-sm font-medium hover:underline truncate">
                          {displayName}
                        </p>
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.listsCount} lists
                      </p>
                    </div>
                    {isSignedIn && (
                      <FollowButton
                        userId={user.id}
                        size="sm"
                        variant="ghost"
                        showIcon={false}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="mt-4 pt-4 border-t">
          <Link
            href="/members"
            className="text-sm text-primary hover:underline text-center block"
          >
            View all members →
          </Link>
        </div>
      </div>
    </div>
  );
}

