"use client";

import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Flag, CheckCircle2, XCircle, MessageSquare, FileText, Eye, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ReportsManagementTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reviewingReport, setReviewingReport] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-forum-reports", page, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        status: statusFilter,
        type: typeFilter,
      });

      const res = await fetch(`/api/admin/forum/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const reviewReport = useMutation({
    mutationFn: async ({
      reportId,
      action,
      notes,
      targetType,
    }: {
      reportId: string;
      action: "approve" | "reject";
      notes?: string;
      targetType: "post" | "reply";
    }) => {
      const res = await fetch(`/api/admin/forum/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes: notes, targetType }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to review report");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forum-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-forum-posts"] });
      toast.success("Report reviewed successfully");
      setReviewingReport(null);
      setReviewAction(null);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const reviewAppeal = useMutation({
    mutationFn: async ({
      reportId,
      action,
      notes,
      targetType,
    }: {
      reportId: string;
      action: "approve" | "reject";
      notes?: string;
      targetType: "post" | "reply";
    }) => {
      const res = await fetch(`/api/admin/forum/reports/${reportId}/appeal`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes: notes, targetType }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to review appeal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forum-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-forum-posts"] });
      toast.success("Appeal reviewed successfully");
      setReviewingReport(null);
      setReviewAction(null);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const reports = data?.reports || [];
  const pagination = data?.pagination;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="destructive">Pending</Badge>;
      case "reviewed":
        return <Badge variant="secondary">Reviewed</Badge>;
      case "appealed":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">Appealed</Badge>;
      case "appeal_approved":
        return <Badge variant="default" className="bg-green-500">Appeal Approved</Badge>;
      case "appeal_rejected":
        return <Badge variant="destructive">Appeal Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleReview = (report: any, action: "approve" | "reject") => {
    setReviewingReport(report);
    setReviewAction(action);
    setReviewNotes("");
  };

  const handleReviewSubmit = () => {
    if (!reviewingReport || !reviewAction) return;

    if (reviewingReport.status === "appealed") {
      reviewAppeal.mutate({
        reportId: reviewingReport.id,
        action: reviewAction,
        notes: reviewNotes || undefined,
        targetType: reviewingReport.type,
      });
    } else {
      reviewReport.mutate({
        reportId: reviewingReport.id,
        action: reviewAction,
        notes: reviewNotes || undefined,
        targetType: reviewingReport.type,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
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
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[140px] cursor-pointer">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="appealed">Appealed</SelectItem>
            <SelectItem value="appeal_approved">Appeal Approved</SelectItem>
            <SelectItem value="appeal_rejected">Appeal Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[140px] cursor-pointer">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="post">Posts Only</SelectItem>
            <SelectItem value="reply">Replies Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No reports found
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report: any) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {report.type === "post" ? (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="capitalize">{report.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      {report.type === "post" ? (
                        <Link
                          href={`/forum/${report.target.slug || report.target.id}`}
                          className="font-medium hover:underline cursor-pointer line-clamp-1"
                        >
                          {report.target.title}
                        </Link>
                      ) : (
                        <div className="space-y-1">
                          <Link
                            href={`/forum/${report.target.post.slug || report.target.post.id}`}
                            className="text-xs text-muted-foreground hover:underline cursor-pointer"
                          >
                            Post: {report.target.post.title}
                          </Link>
                          <p className="text-sm line-clamp-2">{report.target.content}</p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {report.reporter?.displayName || report.reporter?.username || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm font-medium line-clamp-1">{report.reason}</p>
                      {report.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {report.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {report.status === "pending" ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleReview(report, "approve")}
                          className="cursor-pointer"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(report, "reject")}
                          className="cursor-pointer"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    ) : report.status === "appealed" ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleReview(report, "approve")}
                          className="cursor-pointer"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve Appeal
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(report, "reject")}
                          className="cursor-pointer"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject Appeal
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Reviewed</span>
                    )}
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
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
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

      {/* Review Dialog */}
      <Dialog open={!!reviewingReport} onOpenChange={() => {
        setReviewingReport(null);
        setReviewAction(null);
        setReviewNotes("");
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {reviewingReport?.status === "appealed" ? "Review Appeal" : "Review Report"}
            </DialogTitle>
            <DialogDescription>
              {reviewingReport?.status === "appealed"
                ? "Review the appeal and decide whether to approve or reject it."
                : "Review the report and decide whether to approve (hide content) or reject (dismiss report)."}
            </DialogDescription>
          </DialogHeader>
          {reviewingReport && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Content</Label>
                <div className="p-3 rounded-lg border bg-muted/50">
                  {reviewingReport.type === "post" ? (
                    <div>
                      <p className="font-medium">{reviewingReport.target.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                        {reviewingReport.target.content}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Post: {reviewingReport.target.post.title}
                      </p>
                      <p className="text-sm">{reviewingReport.target.content}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Report Reason</Label>
                <div className="p-3 rounded-lg border bg-muted/50">
                  <p className="font-medium">{reviewingReport.reason}</p>
                  {reviewingReport.description && (
                    <p className="text-sm text-muted-foreground mt-1">{reviewingReport.description}</p>
                  )}
                </div>
              </div>
              {reviewingReport.status === "appealed" && reviewingReport.appealReason && (
                <div className="space-y-2">
                  <Label>Appeal Reason</Label>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-sm">{reviewingReport.appealReason}</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reviewNotes">Review Notes (optional)</Label>
                <Textarea
                  id="reviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about your decision..."
                  rows={3}
                  className="cursor-text resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReviewingReport(null);
                setReviewAction(null);
                setReviewNotes("");
              }}
              disabled={reviewReport.isPending || reviewAppeal.isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={reviewAction === "approve" ? "default" : "destructive"}
              onClick={handleReviewSubmit}
              disabled={reviewReport.isPending || reviewAppeal.isPending}
              className="cursor-pointer"
            >
              {reviewReport.isPending || reviewAppeal.isPending
                ? "Processing..."
                : reviewAction === "approve"
                ? reviewingReport?.status === "appealed"
                  ? "Approve Appeal"
                  : "Approve Report"
                : reviewingReport?.status === "appealed"
                ? "Reject Appeal"
                : "Reject Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

