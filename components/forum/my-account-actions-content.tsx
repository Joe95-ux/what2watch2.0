"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Ban,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type SortField = "actionAt" | "type" | "status";
type SortOrder = "asc" | "desc";
type StatusFilter = "all" | "none" | "pending" | "reviewed" | "approved" | "rejected";
type TypeFilter = "all" | "ban" | "suspend";

export function MyAccountActionsContent() {
  const queryClient = useQueryClient();
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortField, setSortField] = useState<SortField>("actionAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [appealReason, setAppealReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["my-account-actions"],
    queryFn: async () => {
      const res = await fetch("/api/forum/account-actions");
      if (!res.ok) throw new Error("Failed to fetch account actions");
      return res.json();
    },
  });

  const appealAction = useMutation({
    mutationFn: async ({
      appealReason,
      actionType,
    }: {
      appealReason: string;
      actionType: "ban" | "suspend";
    }) => {
      const res = await fetch("/api/forum/account-actions/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appealReason, actionType }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit appeal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-account-actions"] });
      toast.success("Appeal submitted successfully");
      setSelectedAction(null);
      setAppealReason("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const actions = data?.actions || [];

  // Filter actions
  const filteredActions = useMemo(() => {
    return actions.filter((action: any) => {
      if (statusFilter !== "all") {
        if (statusFilter === "none" && action.appealStatus !== "none") return false;
        if (statusFilter !== "none" && action.appealStatus !== statusFilter) return false;
      }
      if (typeFilter !== "all" && action.type !== typeFilter) return false;
      return true;
    });
  }, [actions, statusFilter, typeFilter]);

  // Sort actions
  const sortedActions = useMemo(() => {
    return [...filteredActions].sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "actionAt":
          aValue = new Date(a.actionAt).getTime();
          bValue = new Date(b.actionAt).getTime();
          break;
        case "type":
          aValue = a.type;
          bValue = b.type;
          break;
        case "status":
          aValue = a.appealStatus || "none";
          bValue = b.appealStatus || "none";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredActions, sortField, sortOrder]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-500 font-sm font-medium">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Pending
          </Badge>
        );
      case "reviewed":
        return (
          <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-500 font-sm font-medium">
            Reviewed
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600 font-sm font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 font-sm font-medium">
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="font-sm font-medium">
            No Appeal
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === "ban") {
      return (
        <Badge variant="destructive" className="font-sm font-medium">
          <Ban className="h-3.5 w-3.5 mr-1.5" />
          Ban
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="font-sm font-medium">
        <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
        Suspension
      </Badge>
    );
  };

  const canAppeal = (action: any) => {
    return action.appealStatus === "none" || action.appealStatus === "rejected";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleViewDetails = (action: any) => {
    setSelectedAction(action);
    setAppealReason("");
  };

  const handleAppeal = async () => {
    if (!selectedAction || !appealReason.trim()) return;
    await appealAction.mutateAsync({
      appealReason: appealReason.trim(),
      actionType: selectedAction.type,
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="w-[120px]"><Skeleton className="h-4 w-16" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (actions.length === 0) {
    return null; // Don't show anything if user has no bans/suspensions
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Account Actions</h2>
        <p className="text-sm text-muted-foreground">
          View your account bans or suspensions and appeal if you believe they are incorrect.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="status-filter" className="text-sm font-medium">Status:</Label>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger id="status-filter" className="w-[140px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="none">No Appeal</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="type-filter" className="text-sm font-medium">Type:</Label>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
            <SelectTrigger id="type-filter" className="w-[120px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="ban">Bans</SelectItem>
              <SelectItem value="suspend">Suspensions</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground ml-auto">
          {sortedActions.length} {sortedActions.length === 1 ? "action" : "actions"}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-sm font-medium -ml-3 cursor-pointer"
                  onClick={() => handleSort("type")}
                >
                  Type
                  <SortIcon field="type" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-sm font-medium -ml-3 cursor-pointer"
                  onClick={() => handleSort("actionAt")}
                >
                  Reason
                  <SortIcon field="actionAt" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-sm font-medium -ml-3 cursor-pointer"
                  onClick={() => handleSort("status")}
                >
                  Appeal Status
                  <SortIcon field="status" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-sm font-medium -ml-3 cursor-pointer"
                  onClick={() => handleSort("actionAt")}
                >
                  Action Date
                  <SortIcon field="actionAt" />
                </Button>
              </TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedActions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  No actions found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              sortedActions.map((action: any) => (
                <TableRow key={action.id} className="hover:bg-muted/50">
                  <TableCell className="text-sm">
                    {getTypeBadge(action.type)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="line-clamp-2">
                      <span className="font-medium">{action.reason || "No reason provided"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {getStatusBadge(action.appealStatus || "none")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(action.actionAt), { addSuffix: true })}
                    {action.until && (
                      <span className="block text-xs mt-0.5">
                        Until {new Date(action.until).toLocaleDateString()}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-sm cursor-pointer"
                        onClick={() => handleViewDetails(action)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Button>
                      {canAppeal(action) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-sm cursor-pointer"
                          onClick={() => {
                            setSelectedAction(action);
                            setAppealReason("");
                          }}
                        >
                          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                          Appeal
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail/Appeal Dialog */}
      {selectedAction && (
        <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
          <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[90vh] p-0 overflow-hidden">
            {/* Fixed Header */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <DialogTitle className="text-lg">
                {selectedAction.type === "ban" ? "Ban Details" : "Suspension Details"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {canAppeal(selectedAction)
                  ? "Review the action details and submit an appeal if you believe this is incorrect."
                  : "View the action details and appeal status."}
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-6 scrollbar-thin">
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Appeal Status</Label>
                  {getStatusBadge(selectedAction.appealStatus || "none")}
                </div>

                {/* Action Type */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Action Type</Label>
                  {getTypeBadge(selectedAction.type)}
                </div>

                {/* Reason */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Reason</Label>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedAction.reason || "No reason provided"}
                    </p>
                  </div>
                </div>

                {/* Action Date and Duration */}
                <div className="flex flex-row items-start gap-6 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-sm font-medium mb-2 block">Action Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedAction.actionAt), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(selectedAction.actionAt).toLocaleString()}
                    </p>
                  </div>
                  {selectedAction.until && (
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-sm font-medium mb-2 block">Duration</Label>
                      <p className="text-sm text-muted-foreground">
                        Until {new Date(selectedAction.until).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Appeal Reason (if exists) */}
                {selectedAction.appealReason && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Your Appeal</Label>
                    <div className="p-3 rounded-lg border bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">{selectedAction.appealReason}</p>
                      {selectedAction.appealAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Submitted {formatDistanceToNow(new Date(selectedAction.appealAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Appeal Form */}
                {canAppeal(selectedAction) && (
                  <div>
                    <Label htmlFor="appeal-reason" className="text-sm font-medium mb-2 block">
                      Appeal Reason *
                    </Label>
                    <Textarea
                      id="appeal-reason"
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="Please explain why you believe this action is incorrect..."
                      rows={5}
                      className="text-sm cursor-text resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Your appeal will be reviewed by moderators.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAction(null);
                  setAppealReason("");
                }}
                disabled={appealAction.isPending}
                className="cursor-pointer text-sm"
              >
                {canAppeal(selectedAction) ? "Cancel" : "Close"}
              </Button>
              {canAppeal(selectedAction) && (
                <Button
                  onClick={handleAppeal}
                  disabled={appealAction.isPending || !appealReason.trim()}
                  className="cursor-pointer text-sm"
                >
                  {appealAction.isPending ? "Submitting..." : "Submit Appeal"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

