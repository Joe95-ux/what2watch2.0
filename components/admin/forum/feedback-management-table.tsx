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
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Mail, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface FeedbackReply {
  id: string;
  message: string;
  status: string | null;
  createdAt: string;
  repliedBy: {
    username: string | null;
    displayName: string | null;
  };
}

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
  replyCount?: number;
  replies?: FeedbackReply[];
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
  const [replyStatus, setReplyStatus] = useState<string>("");
  const [isLoadingFeedbackDetail, setIsLoadingFeedbackDetail] = useState(false);

  const updateStatus = useMutation({
    mutationFn: async ({
      feedbackId,
      status,
    }: {
      feedbackId: string;
      status: string;
    }) => {
      const res = await fetch(`/api/admin/feedback/${feedbackId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      // Reload feedback detail if viewing
      if (viewingFeedback) {
        await loadFeedbackDetail(viewingFeedback.id);
      }
      toast.success("Status updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

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

  const loadFeedbackDetail = async (feedbackId: string) => {
    setIsLoadingFeedbackDetail(true);
    try {
      const res = await fetch(`/api/admin/feedback/${feedbackId}`);
      if (!res.ok) throw new Error("Failed to fetch feedback detail");
      const data = await res.json();
      setViewingFeedback(data.feedback);
    } catch (error) {
      console.error("Failed to load feedback detail:", error);
      toast.error("Failed to load feedback details");
    } finally {
      setIsLoadingFeedbackDetail(false);
    }
  };

  const replyToFeedback = useMutation({
    mutationFn: async ({
      feedbackId,
      message,
      status,
    }: {
      feedbackId: string;
      message: string;
      status?: string;
    }) => {
      const res = await fetch(`/api/admin/feedback/${feedbackId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send reply");
      }
      return res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      // Reload feedback detail to get updated replies
      if (viewingFeedback) {
        await loadFeedbackDetail(viewingFeedback.id);
      }
      toast.success("Reply sent successfully");
      setReplyMessage("");
      setReplyStatus("");
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
        return "destructive";
      case "IN_PROGRESS":
        return "default";
      case "RESOLVED":
        return "secondary";
      case "CLOSED":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400 dark:bg-red-500/20";
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400 dark:bg-blue-500/20";
      case "RESOLVED":
        return "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400 dark:bg-green-500/20";
      case "CLOSED":
        return "bg-gray-500/10 text-gray-700 border-gray-500/30 dark:text-gray-400 dark:bg-gray-500/20";
      default:
        return "";
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
                <TableHead>Replies</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
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
              <TableHead>Replies</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    <Badge 
                      variant={getStatusColor(feedback.status) as any}
                      className={getStatusClassName(feedback.status)}
                    >
                      {feedback.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {feedback.replyCount || 0}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewingFeedback(feedback);
                          loadFeedbackDetail(feedback.id);
                        }}
                        className="gap-2 cursor-pointer"
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
                          setReplyStatus("");
                          loadFeedbackDetail(feedback.id);
                        }}
                        className="gap-2 cursor-pointer"
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

      {/* View/Reply Dialog with Fixed Header/Footer */}
      <Dialog open={!!viewingFeedback} onOpenChange={() => {
        setViewingFeedback(null);
        setReplyMessage("");
        setReplyStatus("");
      }}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[80vh] p-0">
          {/* Fixed Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
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
                    <Badge 
                      variant={getStatusColor(viewingFeedback.status) as any}
                      className={getStatusClassName(viewingFeedback.status)}
                    >
                      {viewingFeedback.status.replace("_", " ")}
                    </Badge>
                    <Select
                      value={viewingFeedback.status}
                      onValueChange={(newStatus) => {
                        if (viewingFeedback) {
                          updateStatus.mutate({
                            feedbackId: viewingFeedback.id,
                            status: newStatus,
                          });
                        }
                      }}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className="w-[140px] h-7 ml-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
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

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 px-6 py-4 scrollbar-thin">
            {isLoadingFeedbackDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Original Message</Label>
                  <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                    {viewingFeedback?.message}
                  </div>
                </div>

                {/* Reply History */}
                {viewingFeedback?.replies && viewingFeedback.replies.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Reply History ({viewingFeedback.replies.length})</Label>
                    <div className="space-y-3">
                      {viewingFeedback.replies.map((reply) => (
                        <div key={reply.id} className="border rounded-lg p-4 bg-primary/5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {reply.repliedBy?.displayName || reply.repliedBy?.username || "Admin"}
                              </span>
                              {reply.status && (
                                <Badge 
                                  variant={getStatusColor(reply.status) as any}
                                  className={cn("text-xs", getStatusClassName(reply.status))}
                                >
                                  {reply.status.replace("_", " ")}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{reply.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply Form */}
                <div>
                  <Label htmlFor="reply-message" className="text-sm font-medium">Reply Message</Label>
                  <Textarea
                    id="reply-message"
                    className="mt-2 min-h-[120px]"
                    placeholder="Enter your reply message. This will be sent to the user via email."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                  />
                  <div className="mt-2">
                    <Label htmlFor="reply-status" className="text-sm font-medium">Update Status (Optional)</Label>
                    <Select value={replyStatus} onValueChange={setReplyStatus}>
                      <SelectTrigger id="reply-status" className="w-full mt-1">
                        <SelectValue placeholder="Keep current status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Keep current status</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Fixed Footer */}
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setViewingFeedback(null);
                setReplyMessage("");
                setReplyStatus("");
              }}
              className="cursor-pointer"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (viewingFeedback && replyMessage.trim()) {
                  replyToFeedback.mutate({
                    feedbackId: viewingFeedback.id,
                    message: replyMessage.trim(),
                    status: replyStatus || undefined,
                  });
                }
              }}
              disabled={!replyMessage.trim() || replyToFeedback.isPending}
              className="cursor-pointer"
            >
              {replyToFeedback.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
