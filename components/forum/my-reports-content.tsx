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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Flag,
  FileText,
  MessageSquare,
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
import Link from "next/link";
import { cn } from "@/lib/utils";

type SortField = "createdAt" | "status" | "type" | "reason";
type SortOrder = "asc" | "desc";
type StatusFilter = "all" | "pending" | "reviewed" | "appealed" | "appeal_approved" | "appeal_rejected";
type TypeFilter = "all" | "post" | "reply";

export function MyReportsContent() {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [appealReason, setAppealReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["my-forum-reports"],
    queryFn: async () => {
      const res = await fetch("/api/forum/reports/my-reports");
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const appealReport = useMutation({
    mutationFn: async ({
      reportId,
      appealReason,
      targetType,
    }: {
      reportId: string;
      appealReason: string;
      targetType: "post" | "reply";
    }) => {
      const res = await fetch(`/api/forum/reports/${reportId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appealReason, targetType }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit appeal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-forum-reports"] });
      toast.success("Appeal submitted successfully");
      setSelectedReport(null);
      setAppealReason("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const postReports = data?.postReports || [];
  const replyReports = data?.replyReports || [];
  const allReports = [...postReports, ...replyReports];

  // Filter reports
  const filteredReports = useMemo(() => {
    return allReports.filter((report: any) => {
      if (statusFilter !== "all" && report.status !== statusFilter) return false;
      if (typeFilter !== "all" && report.type !== typeFilter) return false;
      return true;
    });
  }, [allReports, statusFilter, typeFilter]);

  // Sort reports
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "type":
          aValue = a.type;
          bValue = b.type;
          break;
        case "reason":
          aValue = a.reason;
          bValue = b.reason;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredReports, sortField, sortOrder]);

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
      case "appealed":
        return (
          <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-500 font-sm font-medium">
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
            Appealed
          </Badge>
        );
      case "appeal_approved":
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600 font-sm font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Approved
          </Badge>
        );
      case "appeal_rejected":
        return (
          <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 font-sm font-medium">
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="font-sm font-medium">{status}</Badge>;
    }
  };

  const canAppeal = (report: any) => {
    return report.status === "reviewed" || report.status === "pending";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleViewDetails = (report: any) => {
    setSelectedReport(report);
    setAppealReason("");
  };

  const handleAppeal = async () => {
    if (!selectedReport || !appealReason.trim()) return;
    await appealReport.mutateAsync({
      reportId: selectedReport.id,
      appealReason: appealReason.trim(),
      targetType: selectedReport.type,
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
              {Array.from({ length: 5 }).map((_, i) => (
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

  if (allReports.length === 0) {
    return (
      <div className="text-center py-12">
        <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Reports</h3>
        <p className="text-sm text-muted-foreground">
          Your content hasn't been reported. Keep up the great work!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Reported Content</h2>
        <p className="text-sm text-muted-foreground">
          View reports on your content and appeal if you believe they are incorrect.
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="appealed">Appealed</SelectItem>
              <SelectItem value="appeal_approved">Approved</SelectItem>
              <SelectItem value="appeal_rejected">Rejected</SelectItem>
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
              <SelectItem value="post">Posts</SelectItem>
              <SelectItem value="reply">Replies</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground ml-auto">
          {sortedReports.length} {sortedReports.length === 1 ? "report" : "reports"}
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
                  onClick={() => handleSort("reason")}
                >
                  Content
                  <SortIcon field="reason" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-sm font-medium -ml-3 cursor-pointer"
                  onClick={() => handleSort("reason")}
                >
                  Reason
                  <SortIcon field="reason" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-sm font-medium -ml-3 cursor-pointer"
                  onClick={() => handleSort("status")}
                >
                  Status
                  <SortIcon field="status" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-sm font-medium -ml-3 cursor-pointer"
                  onClick={() => handleSort("createdAt")}
                >
                  Reported
                  <SortIcon field="createdAt" />
                </Button>
              </TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No reports found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              sortedReports.map((report: any) => (
                <TableRow key={report.id} className="hover:bg-muted/50">
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      {report.type === "post" ? (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="capitalize">{report.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="line-clamp-2">
                      {report.type === "post" ? (
                        <Link
                          href={`/forum/${report.target.slug || report.target.id}`}
                          className="hover:underline text-foreground"
                        >
                          {report.target.title || "Untitled Post"}
                        </Link>
                      ) : (
                        <div>
                          <Link
                            href={`/forum/${report.target.post.slug || report.target.post.id}`}
                            className="text-xs text-muted-foreground hover:underline block mb-1"
                          >
                            {report.target.post.title}
                          </Link>
                          <span className="line-clamp-2">{report.target.content}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="line-clamp-2">
                      <span className="font-medium">{report.reason}</span>
                      {report.description && (
                        <span className="text-muted-foreground block mt-0.5">
                          {report.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {getStatusBadge(report.status)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-sm cursor-pointer"
                        onClick={() => handleViewDetails(report)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Button>
                      {canAppeal(report) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-sm cursor-pointer"
                          onClick={() => {
                            setSelectedReport(report);
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
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[90vh] p-0 overflow-hidden">
            {/* Fixed Header */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <DialogTitle className="text-lg">
                {selectedReport.type === "post" ? "Post Report Details" : "Reply Report Details"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {canAppeal(selectedReport)
                  ? "Review the report details and submit an appeal if you believe this is incorrect."
                  : "View the report details and review status."}
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-6 scrollbar-thin">
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  {getStatusBadge(selectedReport.status)}
                </div>

                {/* Your Content */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Your Content</Label>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    {selectedReport.type === "post" ? (
                      <div>
                        <Link
                          href={`/forum/${selectedReport.target.slug || selectedReport.target.id}`}
                          className="text-sm font-medium hover:underline text-primary mb-2 block"
                        >
                          {selectedReport.target.title || "Untitled Post"}
                        </Link>
                        {selectedReport.target.content && (
                          <p className="text-sm whitespace-pre-wrap">
                            {selectedReport.target.content}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Link
                          href={`/forum/${selectedReport.target.post.slug || selectedReport.target.post.id}`}
                          className="text-xs text-muted-foreground hover:underline mb-2 block"
                        >
                          Post: {selectedReport.target.post.title}
                        </Link>
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedReport.target.content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Report Reason */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Report Reason</Label>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-sm font-medium">{selectedReport.reason}</p>
                    {selectedReport.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedReport.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reporter and Date - Same Row */}
                <div className="flex flex-row items-start gap-6 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-sm font-medium mb-2 block">Reported By</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.reporter?.displayName || selectedReport.reporter?.username || "Unknown"}
                    </p>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-sm font-medium mb-2 block">Reported</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedReport.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Appeal Reason (if exists) */}
                {selectedReport.appealReason && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Your Appeal</Label>
                    <div className="p-3 rounded-lg border bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">{selectedReport.appealReason}</p>
                      {selectedReport.appealAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Submitted {formatDistanceToNow(new Date(selectedReport.appealAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Review Notes (if exists) */}
                {selectedReport.reviewNotes && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Admin Review Notes</Label>
                    <div className="p-3 rounded-lg border bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">{selectedReport.reviewNotes}</p>
                      {selectedReport.reviewedAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Reviewed {formatDistanceToNow(new Date(selectedReport.reviewedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Appeal Form */}
                {canAppeal(selectedReport) && (
                  <div>
                    <Label htmlFor="appeal-reason" className="text-sm font-medium mb-2 block">
                      Appeal Reason *
                    </Label>
                    <Textarea
                      id="appeal-reason"
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="Please explain why you believe this report is incorrect..."
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
                  setSelectedReport(null);
                  setAppealReason("");
                }}
                disabled={appealReport.isPending}
                className="cursor-pointer text-sm"
              >
                {canAppeal(selectedReport) ? "Cancel" : "Close"}
              </Button>
              {canAppeal(selectedReport) && (
                <Button
                  onClick={handleAppeal}
                  disabled={appealReport.isPending || !appealReason.trim()}
                  className="cursor-pointer text-sm"
                >
                  {appealReport.isPending ? "Submitting..." : "Submit Appeal"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
