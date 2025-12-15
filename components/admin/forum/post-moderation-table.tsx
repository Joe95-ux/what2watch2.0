"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Search, Eye, EyeOff, Lock, Unlock, Trash2, Flag, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { EditPostDialog } from "@/components/forum/edit-post-dialog";

export function PostModerationTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [hiddenFilter, setHiddenFilter] = useState("");
  const [lockedFilter, setLockedFilter] = useState("");
  const [reportedFilter, setReportedFilter] = useState("");
  const [editingPost, setEditingPost] = useState<any>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Handle window resize to reset search expansion on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSearchExpanded(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-forum-posts", page, search, hiddenFilter, lockedFilter, reportedFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (search) params.append("search", search);
      if (hiddenFilter) params.append("isHidden", hiddenFilter);
      if (lockedFilter) params.append("isLocked", lockedFilter);
      if (reportedFilter) params.append("hasReports", reportedFilter);

      const res = await fetch(`/api/admin/forum/posts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  const moderatePost = useMutation({
    mutationFn: async ({
      postId,
      action,
      reason,
    }: {
      postId: string;
      action: string;
      reason?: string;
    }) => {
      const res = await fetch(`/api/admin/forum/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to moderate post");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forum-posts"] });
      toast.success("Post moderated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const posts = data?.posts || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 overflow-x-auto scrollbar-hide">
        {/* Mobile: Search button or expanded search */}
        {isSearchExpanded ? (
          <div className="relative flex-1 min-w-0 lg:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              onBlur={() => {
                // Collapse if search is empty
                if (!search) {
                  setIsSearchExpanded(false);
                }
              }}
              autoFocus
              className="pl-9 cursor-text"
            />
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSearchExpanded(true)}
            className="lg:hidden cursor-pointer flex-shrink-0"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        )}
        {/* Desktop search - always visible */}
        <div className="relative flex-1 hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 cursor-text"
          />
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <Select value={hiddenFilter || "all"} onValueChange={(value) => { setHiddenFilter(value === "all" ? "" : value); setPage(1); }}>
            <SelectTrigger className="w-[140px] cursor-pointer">
              <SelectValue placeholder="All Posts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="false">Visible</SelectItem>
              <SelectItem value="true">Hidden</SelectItem>
            </SelectContent>
          </Select>
          <Select value={lockedFilter || "all"} onValueChange={(value) => { setLockedFilter(value === "all" ? "" : value); setPage(1); }}>
            <SelectTrigger className="w-[140px] cursor-pointer">
              <SelectValue placeholder="All Posts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="false">Unlocked</SelectItem>
              <SelectItem value="true">Locked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={reportedFilter || "all"} onValueChange={(value) => { setReportedFilter(value === "all" ? "" : value); setPage(1); }}>
            <SelectTrigger className="w-[140px] cursor-pointer">
              <SelectValue placeholder="All Posts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="true">Reported</SelectItem>
              <SelectItem value="false">Not Reported</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Replies</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No posts found
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post: any) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <Link
                      href={`/forum/${post.slug || post.id}`}
                      className="font-medium hover:underline cursor-pointer"
                    >
                      {post.title}
                    </Link>
                  </TableCell>
                  <TableCell>{post.user?.displayName || post.user?.username || "N/A"}</TableCell>
                  <TableCell>{post.views}</TableCell>
                  <TableCell>{post.score}</TableCell>
                  <TableCell>{post._count?.replies || 0}</TableCell>
                  <TableCell>
                    {(post._count?.totalReports || post._count?.reports || 0) > 0 ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <Flag className="h-3 w-3" />
                        {post._count?.totalReports || post._count?.reports || 0}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {post.isHidden && <Badge variant="secondary">Hidden</Badge>}
                      {post.isLocked && <Badge variant="destructive">Locked</Badge>}
                      {!post.isHidden && !post.isLocked && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingPost(post)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Post
                        </DropdownMenuItem>
                        {post.isHidden ? (
                          <DropdownMenuItem
                            onClick={() =>
                              moderatePost.mutate({ postId: post.id, action: "unhide" })
                            }
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Unhide
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              moderatePost.mutate({ postId: post.id, action: "hide", reason: "Moderator action" })
                            }
                            className="cursor-pointer"
                          >
                            <EyeOff className="mr-2 h-4 w-4" />
                            Hide
                          </DropdownMenuItem>
                        )}
                        {post.isLocked ? (
                          <DropdownMenuItem
                            onClick={() =>
                              moderatePost.mutate({ postId: post.id, action: "unlock" })
                            }
                            className="cursor-pointer"
                          >
                            <Unlock className="mr-2 h-4 w-4" />
                            Unlock
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              moderatePost.mutate({ postId: post.id, action: "lock", reason: "Moderator action" })
                            }
                            className="cursor-pointer"
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            Lock
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this post?")) {
                              moderatePost.mutate({ postId: post.id, action: "delete", reason: "Moderator action" });
                            }
                          }}
                          className="cursor-pointer text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} posts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="cursor-pointer"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Post Dialog */}
      {editingPost && (
        <EditPostDialog
          isOpen={!!editingPost}
          onClose={() => setEditingPost(null)}
          post={{
            id: editingPost.id,
            slug: editingPost.slug,
            title: editingPost.title,
            content: editingPost.content,
            tags: editingPost.tags || [],
            tmdbId: editingPost.tmdbId,
            mediaType: editingPost.mediaType,
            category: editingPost.category,
          }}
        />
      )}
    </div>
  );
}

