"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Loader2, Search, Filter, X, ChevronDown, ChevronUp, ArrowUpDown, ArrowDown, ArrowUp, Edit, Infinity, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface UserWithQuota {
  id: string;
  username: string | null;
  displayName: string | null;
  email: string;
  chatQuota: number | null;
  questionCount: number;
  maxQuestions: number;
  createdAt: string;
}

export function ChatQuotaManagementTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [sortField, setSortField] = useState<"createdAt" | "questionCount" | "username">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [editingUser, setEditingUser] = useState<UserWithQuota | null>(null);
  const [quotaValue, setQuotaValue] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkQuotaValue, setBulkQuotaValue] = useState<string>("");
  const [isBulkQuotaDialogOpen, setIsBulkQuotaDialogOpen] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-chat-quota", page, debouncedSearchQuery, sortField, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: debouncedSearchQuery,
        sortField: sortField,
        sortOrder: sortOrder,
      });

      const res = await fetch(`/api/admin/chat-quota?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const updateQuota = useMutation({
    mutationFn: async ({ userId, chatQuota }: { userId: string; chatQuota: number | null | -1 }) => {
      const res = await fetch("/api/admin/chat-quota", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, chatQuota }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update quota");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-chat-quota"] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setQuotaValue("");
      toast.success("Quota updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleDropdown = (filterLabel: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [filterLabel]: !prev[filterLabel],
    }));
  };

  const handleEditQuota = (user: UserWithQuota) => {
    setEditingUser(user);
    if (user.chatQuota === null) {
      setQuotaValue("6"); // Default
    } else if (user.chatQuota === -1) {
      setQuotaValue("-1"); // Unlimited
    } else {
      setQuotaValue(user.chatQuota.toString());
    }
    setIsEditDialogOpen(true);
  };

  const handleSaveQuota = () => {
    if (!editingUser) return;

    let parsedQuota: number | null | -1;
    if (quotaValue.trim() === "" || quotaValue === "default") {
      parsedQuota = null; // Default (6)
    } else if (quotaValue === "-1" || quotaValue.toLowerCase() === "unlimited") {
      parsedQuota = -1; // Unlimited
    } else {
      const num = parseInt(quotaValue);
      if (isNaN(num) || num < 0) {
        toast.error("Please enter a valid number (0 or greater) or -1 for unlimited");
        return;
      }
      parsedQuota = num;
    }

    updateQuota.mutate({
      userId: editingUser.id,
      chatQuota: parsedQuota,
    });
  };

  const getQuotaDisplay = (user: UserWithQuota) => {
    if (user.maxQuestions === -1) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400 dark:bg-green-500/20">Unlimited</Badge>;
    }
    return (
      <span className="text-sm">
        {user.maxQuestions}
      </span>
    );
  };

  const getQuotaStatus = (user: UserWithQuota) => {
    if (user.maxQuestions === -1) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400 dark:bg-green-500/20">Unlimited</Badge>;
    }
    const percentage = (user.questionCount / user.maxQuestions) * 100;
    if (percentage >= 100) {
      return <Badge variant="destructive">Exceeded</Badge>;
    } else if (percentage >= 80) {
      return <Badge variant="default" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400 dark:bg-yellow-500/20">Near Limit</Badge>;
    } else {
      return <Badge variant="secondary">Active</Badge>;
    }
  };

  const hasActiveFilters = useMemo(() => {
    return debouncedSearchQuery.trim() !== "";
  }, [debouncedSearchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setPage(1);
  };

  const handleSelectUser = (userId: string, selected: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (selected) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === users.length && users.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u: UserWithQuota) => u.id)));
    }
  };

  const handleBulkQuotaUpdate = () => {
    if (selectedUserIds.size === 0) return;
    setIsBulkQuotaDialogOpen(true);
  };

  const handleBulkQuotaSave = async () => {
    if (selectedUserIds.size === 0 || !bulkQuotaValue.trim()) return;

    let parsedQuota: number | null | -1;
    if (bulkQuotaValue.trim() === "" || bulkQuotaValue === "default") {
      parsedQuota = null; // Default (6)
    } else if (bulkQuotaValue === "-1" || bulkQuotaValue.toLowerCase() === "unlimited") {
      parsedQuota = -1; // Unlimited
    } else {
      const num = parseInt(bulkQuotaValue);
      if (isNaN(num) || num < 0) {
        toast.error("Please enter a valid number (0 or greater) or -1 for unlimited");
        return;
      }
      parsedQuota = num;
    }

    const selectedCount = selectedUserIds.size;
    const userIds = Array.from(selectedUserIds);

    try {
      // Update all selected users sequentially to avoid overwhelming the API
      for (const userId of userIds) {
        await updateQuota.mutateAsync({ userId, chatQuota: parsedQuota });
      }
      setSelectedUserIds(new Set());
      setBulkQuotaValue("");
      setIsBulkQuotaDialogOpen(false);
      toast.success(`Updated quota for ${selectedCount} user(s)`);
    } catch (error) {
      toast.error("Failed to update some quotas");
      console.error(error);
    }
  };

  const users = data?.users ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Filter Row */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-0 flex-1 sm:max-w-[20rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className={cn(
                "pl-9 h-9 text-muted-foreground placeholder:text-muted-foreground/60",
                searchQuery ? "pr-20" : "pr-12"
              )}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
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
                      sortOrder !== "desc" && "text-primary"
                    )}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2">
                    <div className="text-xs font-medium mb-2 px-2">Sort by</div>
                    {[
                      { value: "createdAt", label: "Date" },
                      { value: "questionCount", label: "Questions Asked" },
                      { value: "username", label: "Username" },
                    ].map((field) => (
                      <DropdownMenuItem
                        key={field.value}
                        onClick={() => {
                          if (sortField === field.value) {
                            setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                          } else {
                            setSortField(field.value as typeof sortField);
                            setSortOrder("desc");
                          }
                          setPage(1);
                        }}
                        className={cn(
                          "cursor-pointer",
                          sortField === field.value && "bg-accent"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {sortField === field.value && sortOrder === "desc" && (
                            <ArrowDown className="h-4 w-4" />
                          )}
                          {sortField === field.value && sortOrder === "asc" && (
                            <ArrowUp className="h-4 w-4" />
                          )}
                          {sortField !== field.value && <div className="h-4 w-4" />}
                          {field.label}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSortOrder("desc");
                      setPage(1);
                    }}
                    className={cn("cursor-pointer", sortOrder === "desc" && "bg-accent")}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4" />
                      Newest First
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortOrder("asc");
                      setPage(1);
                    }}
                    className={cn("cursor-pointer", sortOrder === "asc" && "bg-accent")}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      Oldest First
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filter Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFilterRowOpen(!isFilterRowOpen)}
            className={cn(
              "h-9 w-9 rounded-full cursor-pointer",
              hasActiveFilters && "bg-primary/10 text-primary"
            )}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Row - Collapsible */}
        {isFilterRowOpen && (
          <div className="overflow-x-auto scrollbar-hide pb-2 border-t pt-3">
            <div className="flex items-center gap-4 min-w-max px-1">
              {/* Clear All Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground cursor-pointer whitespace-nowrap"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear All
                </Button>
              )}
              {!hasActiveFilters && (
                <p className="text-sm text-muted-foreground">No additional filters available</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedUserIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedUserIds.size} of {users.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkQuotaUpdate}
              className="cursor-pointer whitespace-nowrap"
            >
              <Edit className="h-4 w-4 mr-2" />
              Update Quota
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedUserIds(new Set())}
              className="cursor-pointer h-9 w-9"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedUserIds.size === users.length && users.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="cursor-pointer"
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  if (sortField === "questionCount") {
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                  } else {
                    setSortField("questionCount");
                    setSortOrder("desc");
                  }
                  setPage(1);
                }}
              >
                <div className="flex items-center gap-2">
                  Questions Asked
                  {sortField === "questionCount" && (
                    sortOrder === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead>Quota Limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  if (sortField === "createdAt") {
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                  } else {
                    setSortField("createdAt");
                    setSortOrder("desc");
                  }
                  setPage(1);
                }}
              >
                <div className="flex items-center gap-2">
                  Joined
                  {sortField === "createdAt" && (
                    sortOrder === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: UserWithQuota) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUserIds.has(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                      className="cursor-pointer"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      {user.id ? (
                        <Link
                          href={`/users/${user.id}`}
                          className="font-medium hover:underline text-primary"
                        >
                          {user.displayName || user.username || "Unknown"}
                        </Link>
                      ) : (
                        <div className="font-medium">
                          {user.displayName || user.username || "Unknown"}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {user.questionCount}
                  </TableCell>
                  <TableCell>
                    {getQuotaDisplay(user)}
                  </TableCell>
                  <TableCell>
                    {getQuotaStatus(user)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditQuota(user)}
                      className="gap-2 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Quota
                    </Button>
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
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Quota Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chat Quota</DialogTitle>
            <DialogDescription>
              Set the maximum number of questions allowed for {editingUser?.displayName || editingUser?.username || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quota">Quota Limit</Label>
              <Input
                id="quota"
                type="text"
                value={quotaValue}
                onChange={(e) => setQuotaValue(e.target.value)}
                placeholder="Enter number, -1 for unlimited, or leave empty for default (6)"
                className="text-muted-foreground placeholder:text-muted-foreground/60"
              />
              <p className="text-xs text-muted-foreground">
                Enter a number (0 or greater), -1 for unlimited, or leave empty/default for the default limit (6 questions)
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Current questions asked: <strong>{editingUser?.questionCount || 0}</strong></p>
                <p>• Current quota limit: <strong>{editingUser?.maxQuestions === -1 ? "Unlimited" : editingUser?.maxQuestions || 6}</strong></p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingUser(null);
                setQuotaValue("");
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuota}
              disabled={updateQuota.isPending}
              className="cursor-pointer"
            >
              {updateQuota.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Quota Update Dialog */}
      <Dialog open={isBulkQuotaDialogOpen} onOpenChange={setIsBulkQuotaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Quota for {selectedUserIds.size} User(s)</DialogTitle>
            <DialogDescription>
              Set the maximum number of questions allowed for the selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-quota">Quota Limit</Label>
              <Input
                id="bulk-quota"
                type="text"
                value={bulkQuotaValue}
                onChange={(e) => setBulkQuotaValue(e.target.value)}
                placeholder="Enter number, -1 for unlimited, or leave empty for default (6)"
                className="text-muted-foreground placeholder:text-muted-foreground/60"
              />
              <p className="text-xs text-muted-foreground">
                Enter a number (0 or greater), -1 for unlimited, or leave empty/default for the default limit (6 questions)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkQuotaDialogOpen(false);
                setBulkQuotaValue("");
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkQuotaSave}
              disabled={updateQuota.isPending || !bulkQuotaValue.trim()}
              className="cursor-pointer"
            >
              {updateQuota.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${selectedUserIds.size} User(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
