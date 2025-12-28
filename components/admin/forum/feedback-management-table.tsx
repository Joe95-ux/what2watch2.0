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
import { Eye, Mail, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Feedback {
  id: string;
  reason: string;
  priority: string;
  message: string;
  userEmail: string;
  username: string | null;
  status: string;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: {
    username: string | null;
    displayName: string | null;
  };
}

export function FeedbackManagementTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingFeedback, setViewingFeedback] = useState<Feedback | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-feedback", page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        status: statusFilter,
      });

      const res = await fetch(`/api/admin/feedback?${params}`);
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return res.json();
    },
  });

  const replyToFeedback = useMutation({
    mutationFn: async ({
      feedbackId,
      message,
    }: {
      feedbackId: string;
      message: string;
    }) => {
      const res = await fetch(`/api/admin/feedback/${feedbackId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send reply");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      toast.success("Reply sent successfully");
      setViewingFeedback(null);
      setReplyMessage("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "destructive";
      case "High":
        return "default";
      case "Medium":
        return "secondary";
      case "Low":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "default";
      case "IN_PROGRESS":
        return "secondary";
      case "RESOLVED":
        return "outline";
      case "CLOSED":
        return "outline";
      default:
        return "secondary";
    }
  };

  const feedbacks = data?.feedbacks ?? [];
  const pagination = data?.pagination;

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
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No feedback found
                </TableCell>
              </TableRow>
            ) : (
              feedbacks.map((feedback: Feedback) => (
                <TableRow key={feedback.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {feedback.user?.displayName || feedback.user?.username || feedback.username || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">{feedback.userEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>{feedback.reason}</TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(feedback.priority) as any}>
                      {feedback.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(feedback.status) as any}>
                      {feedback.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingFeedback(feedback)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewingFeedback(feedback);
                          setReplyMessage("");
                        }}
                        className="gap-2"
                        disabled={!!feedback.adminReply}
                      >
                        <Mail className="h-4 w-4" />
                        Reply
                      </Button>
                    </div>
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

      {/* View/Reply Dialog */}
      <Dialog open={!!viewingFeedback} onOpenChange={() => {
        setViewingFeedback(null);
        setReplyMessage("");
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
              {viewingFeedback && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">User:</span>
                    <span className="text-sm">
                      {viewingFeedback.user?.displayName || viewingFeedback.user?.username || viewingFeedback.username || "Unknown"}
                    </span>
                    <span className="text-sm text-muted-foreground">({viewingFeedback.userEmail})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Reason:</span>
                    <span className="text-sm">{viewingFeedback.reason}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Priority:</span>
                    <Badge variant={getPriorityColor(viewingFeedback.priority) as any}>
                      {viewingFeedback.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={getStatusColor(viewingFeedback.status) as any}>
                      {viewingFeedback.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Date:</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(viewingFeedback.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Message</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                {viewingFeedback?.message}
              </div>
            </div>

            {viewingFeedback?.adminReply && (
              <div>
                <Label className="text-sm font-medium">Admin Reply</Label>
                <div className="mt-2 p-4 bg-primary/10 rounded-lg whitespace-pre-wrap text-sm">
                  {viewingFeedback.adminReply}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Replied {viewingFeedback.repliedAt && formatDistanceToNow(new Date(viewingFeedback.repliedAt), { addSuffix: true })}
                </div>
              </div>
            )}

            {!viewingFeedback?.adminReply && (
              <div>
                <Label htmlFor="reply-message" className="text-sm font-medium">Reply Message</Label>
                <Textarea
                  id="reply-message"
                  className="mt-2 min-h-[120px]"
                  placeholder="Enter your reply message. This will be sent to the user via email."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewingFeedback(null);
                setReplyMessage("");
              }}
            >
              Close
            </Button>
            {!viewingFeedback?.adminReply && (
              <Button
                onClick={() => {
                  if (viewingFeedback && replyMessage.trim()) {
                    replyToFeedback.mutate({
                      feedbackId: viewingFeedback.id,
                      message: replyMessage.trim(),
                    });
                  }
                }}
                disabled={!replyMessage.trim() || replyToFeedback.isPending}
              >
                {replyToFeedback.isPending ? "Sending..." : "Send Reply"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

