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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Search, Ban, UserCheck, X, Pause } from "lucide-react";
import { BanSuspendModal } from "./ban-suspend-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function UserManagementTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [bannedFilter, setBannedFilter] = useState("");
  const [suspendedFilter, setSuspendedFilter] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username?: string; displayName?: string } | null>(null);

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
    queryKey: ["admin-forum-users", page, search, roleFilter, bannedFilter, suspendedFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);
      if (bannedFilter) params.append("isBanned", bannedFilter);
      if (suspendedFilter) params.append("isSuspended", suspendedFilter);

      const res = await fetch(`/api/admin/forum/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: { 
        role?: string; 
        isBanned?: boolean; 
        banReason?: string;
        bannedUntil?: Date;
        isSuspended?: boolean;
        suspendReason?: string;
        suspendedUntil?: Date;
      };
    }) => {
      const res = await fetch(`/api/admin/forum/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forum-users"] });
      toast.success("User updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleBan = async (reason: string, until?: Date) => {
    if (!selectedUser) return;
    await updateUser.mutateAsync({
      userId: selectedUser.id,
      data: {
        isBanned: true,
        banReason: reason,
        bannedUntil: until,
      },
    });
    setBanModalOpen(false);
    setSelectedUser(null);
  };

  const handleSuspend = async (reason: string, until?: Date) => {
    if (!selectedUser) return;
    await updateUser.mutateAsync({
      userId: selectedUser.id,
      data: {
        isSuspended: true,
        suspendReason: reason,
        suspendedUntil: until,
      },
    });
    setSuspendModalOpen(false);
    setSelectedUser(null);
  };

  const users = data?.users || [];
  const pagination = data?.pagination;

  const getRoleBadge = (role: string, isForumAdmin: boolean, isForumModerator: boolean) => {
    if (isForumAdmin || role === "ADMIN" || role === "SUPER_ADMIN") {
      return <Badge variant="destructive">Admin</Badge>;
    }
    if (isForumModerator || role === "MODERATOR") {
      return <Badge variant="secondary">Moderator</Badge>;
    }
    return <Badge variant="outline">User</Badge>;
  };

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
                <TableHead>Username</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
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
      <div className="flex flex-row items-stretch lg:items-center gap-4 overflow-x-auto scrollbar-hide">
        {/* Mobile: Search button (icon only) or expanded search covering entire row */}
        {isSearchExpanded ? (
          <div className="relative w-full lg:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              autoFocus
              className="pl-9 pr-9 cursor-text"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsSearchExpanded(false);
                setSearch("");
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: Icon-only search button - stays on same row as filters */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsSearchExpanded(true)}
              className="lg:hidden cursor-pointer flex-shrink-0 h-10 w-10"
            >
              <Search className="h-4 w-4" />
            </Button>
            {/* Desktop search - always visible */}
            <div className="relative flex-1 hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 cursor-text"
              />
            </div>
            {/* Filters - visible when search is not expanded */}
            <div className="flex items-center gap-4 flex-shrink-0">
          <Select value={roleFilter || "all"} onValueChange={(value) => { setRoleFilter(value === "all" ? "" : value); setPage(1); }}>
            <SelectTrigger className="w-[140px] cursor-pointer">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="MODERATOR">Moderator</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bannedFilter || "all"} onValueChange={(value) => { setBannedFilter(value === "all" ? "" : value); setPage(1); }}>
            <SelectTrigger className="w-[140px] cursor-pointer">
              <SelectValue placeholder="Ban Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ban Status</SelectItem>
              <SelectItem value="false">Not Banned</SelectItem>
              <SelectItem value="true">Banned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={suspendedFilter || "all"} onValueChange={(value) => { setSuspendedFilter(value === "all" ? "" : value); setPage(1); }}>
            <SelectTrigger className="w-[140px] cursor-pointer">
              <SelectValue placeholder="Suspend Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suspend Status</SelectItem>
              <SelectItem value="false">Not Suspended</SelectItem>
              <SelectItem value="true">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username || "N/A"}</TableCell>
                  <TableCell>{user.username || user.displayName || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role || "USER"}
                        onValueChange={(role) => {
                          // Update role and corresponding flags
                          const data: any = { role };
                          if (role === "ADMIN" || role === "SUPER_ADMIN") {
                            data.isForumAdmin = true;
                            data.isForumModerator = true;
                          } else if (role === "MODERATOR") {
                            data.isForumModerator = true;
                            data.isForumAdmin = false;
                          } else {
                            data.isForumModerator = false;
                            data.isForumAdmin = false;
                          }
                          updateUser.mutate({ userId: user.id, data });
                        }}
                      >
                        <SelectTrigger className="w-[120px] cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">User</SelectItem>
                          <SelectItem value="MODERATOR">Moderator</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {getRoleBadge(user.role, user.isForumAdmin, user.isForumModerator)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.isBanned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : user.isSuspended ? (
                        <Badge variant="secondary">Suspended</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user._count?.forumPosts || 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!user.isBanned && !user.isSuspended && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser({ id: user.id, username: user.username, displayName: user.displayName });
                                setSuspendModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Suspend User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser({ id: user.id, username: user.username, displayName: user.displayName });
                                setBanModalOpen(true);
                              }}
                              className="cursor-pointer text-destructive"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Ban User
                            </DropdownMenuItem>
                          </>
                        )}
                        {user.isSuspended && !user.isBanned && (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                updateUser.mutate({
                                  userId: user.id,
                                  data: { isSuspended: false },
                                })
                              }
                              className="cursor-pointer"
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Unsuspend User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser({ id: user.id, username: user.username, displayName: user.displayName });
                                setBanModalOpen(true);
                              }}
                              className="cursor-pointer text-destructive"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Ban User
                            </DropdownMenuItem>
                          </>
                        )}
                        {user.isBanned && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser.mutate({
                                userId: user.id,
                                data: { isBanned: false },
                              })
                            }
                            className="cursor-pointer"
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Unban User
                          </DropdownMenuItem>
                        )}
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
            Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} users
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

      {/* Ban Modal */}
      <BanSuspendModal
        isOpen={banModalOpen}
        onClose={() => {
          setBanModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleBan}
        actionType="ban"
        userName={selectedUser?.username || selectedUser?.displayName}
        isLoading={updateUser.isPending}
      />

      {/* Suspend Modal */}
      <BanSuspendModal
        isOpen={suspendModalOpen}
        onClose={() => {
          setSuspendModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleSuspend}
        actionType="suspend"
        userName={selectedUser?.username || selectedUser?.displayName}
        isLoading={updateUser.isPending}
      />
    </div>
  );
}

