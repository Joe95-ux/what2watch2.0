"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Eye, Mail, ChevronLeft, ChevronRight, Loader2, Search, Filter, Download, X, ChevronDown, ChevronUp, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, subDays, startOfDay, endOfDay } from "date-fns";
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
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

const FEEDBACK_REASONS = [
  "Bug Report",
  "Feature Request",
  "UI/UX Issue",
  "Performance Issue",
  "Content Issue",
  "Account Issue",
  "Other",
];

const FEEDBACK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export function FeedbackManagementTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "3days" | "7days" | "15days" | "30days" | "custom">("all");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date } | undefined>(undefined);
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [viewingFeedback, setViewingFeedback] = useState<Feedback | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
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

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    if (dateFilter === "all") return undefined;
    if (dateFilter === "custom" && customDateRange?.from && customDateRange?.to) {
      return {
        from: startOfDay(customDateRange.from),
        to: endOfDay(customDateRange.to),
      };
    }
    const now = new Date();
    let from: Date;
    switch (dateFilter) {
      case "today":
        from = startOfDay(now);
        break;
      case "yesterday":
        from = startOfDay(subDays(now, 1));
        break;
      case "3days":
        from = startOfDay(subDays(now, 3));
        break;
      case "7days":
        from = startOfDay(subDays(now, 7));
        break;
      case "15days":
        from = startOfDay(subDays(now, 15));
        break;
      case "30days":
        from = startOfDay(subDays(now, 30));
        break;
      default:
        return undefined;
    }
    return {
      from,
      to: endOfDay(now),
    };
  }, [dateFilter, customDateRange]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-feedback", page, statusFilter, priorityFilter, reasonFilter, dateRange, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        status: statusFilter,
        priority: priorityFilter,
        reason: reasonFilter,
        search: searchQuery,
      });
      if (dateRange?.from) {
        params.append("dateFrom", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append("dateTo", dateRange.to.toISOString());
      }

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

  const toggleDropdown = (filterLabel: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [filterLabel]: !prev[filterLabel],
    }));
  };

  const handleFilterValueChange = (filterLabel: string, value: string, onValueChange: (value: string) => void) => {
    onValueChange(value);
    setOpenDropdowns((prev) => ({
      ...prev,
      [filterLabel]: false,
    }));
  };

  const getFilterDisplayValue = (value: string, options: { value: string; label: string }[]) => {
    const option = options.find((opt) => opt.value === value);
    return option?.label || value;
  };

  const hasActiveFilters = statusFilter !== "all" || priorityFilter !== "all" || reasonFilter !== "all" || dateFilter !== "all" || searchQuery.trim() !== "";

  const clearFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setReasonFilter("all");
    setDateFilter("all");
    setCustomDateRange(undefined);
    setSearchQuery("");
    setPage(1);
  };

  const getDateFilterDisplay = () => {
    if (dateFilter === "all") return "All Time";
    if (dateFilter === "custom" && customDateRange?.from && customDateRange?.to) {
      return `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d")}`;
    }
    const labels: Record<string, string> = {
      today: "Today",
      yesterday: "Yesterday",
      "3days": "Last 3 Days",
      "7days": "Last 7 Days",
      "15days": "Last 15 Days",
      "30days": "Last 30 Days",
    };
    return labels[dateFilter] || "All Time";
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        priority: priorityFilter,
        reason: reasonFilter,
        search: searchQuery,
        export: "csv",
      });
      if (dateRange?.from) {
        params.append("dateFrom", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append("dateTo", dateRange.to.toISOString());
      }

      const res = await fetch(`/api/admin/feedback?${params}`);
      if (!res.ok) throw new Error("Failed to export feedback");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Feedback exported successfully");
    } catch (error) {
      toast.error("Failed to export feedback");
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
      {/* Filter Row */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-0 flex-1 sm:max-w-[20rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-3 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 cursor-pointer"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
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

          {/* Export Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportCSV}
            className="h-9 w-9 rounded-full cursor-pointer"
            disabled={isLoading}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Row - Collapsible */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isFilterRowOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="overflow-x-auto scrollbar-hide pb-2">
            <div className="flex items-center gap-4 min-w-max px-1">
              {/* Status Filter */}
              <DropdownMenu
                open={openDropdowns["Status"] || false}
                onOpenChange={(open) => setOpenDropdowns((prev) => ({ ...prev, Status: open }))}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("Status")}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/80 hover:text-foreground dark:hover:text-foreground transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:outline-none rounded-sm px-2 py-1"
                  >
                    <span>Status:</span>
                    <span className="font-medium">
                      {getFilterDisplayValue(statusFilter, [
                        { value: "all", label: "All Status" },
                        { value: "OPEN", label: "Open" },
                        { value: "IN_PROGRESS", label: "In Progress" },
                        { value: "RESOLVED", label: "Resolved" },
                        { value: "CLOSED", label: "Closed" },
                      ])}
                    </span>
                    {openDropdowns["Status"] ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {[
                    { value: "all", label: "All Status" },
                    { value: "OPEN", label: "Open" },
                    { value: "IN_PROGRESS", label: "In Progress" },
                    { value: "RESOLVED", label: "Resolved" },
                    { value: "CLOSED", label: "Closed" },
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        handleFilterValueChange("Status", option.value, setStatusFilter);
                        setPage(1);
                      }}
                      className={cn("cursor-pointer", statusFilter === option.value && "bg-accent")}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Filter */}
              <DropdownMenu
                open={openDropdowns["Date"] || false}
                onOpenChange={(open) => setOpenDropdowns((prev) => ({ ...prev, Date: open }))}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("Date")}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/80 hover:text-foreground dark:hover:text-foreground transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:outline-none rounded-sm px-2 py-1"
                  >
                    <span>Date:</span>
                    <span className="font-medium">{getDateFilterDisplay()}</span>
                    {openDropdowns["Date"] ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-auto p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left Column - Days List */}
                    <div className="border-b sm:border-b-0 sm:border-r p-1 min-w-[180px]">
                      {[
                        { value: "all", label: "All Time" },
                        { value: "today", label: "Today" },
                        { value: "yesterday", label: "Yesterday" },
                        { value: "3days", label: "Last 3 Days" },
                        { value: "7days", label: "Last 7 Days" },
                        { value: "15days", label: "Last 15 Days" },
                        { value: "30days", label: "Last 30 Days" },
                        { value: "custom", label: "Custom Range" },
                      ].map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => {
                            if (option.value !== "custom") {
                              handleFilterValueChange("Date", option.value, (val) => setDateFilter(val as typeof dateFilter));
                              setPage(1);
                            } else {
                              setDateFilter("custom");
                            }
                          }}
                          className={cn(
                            "cursor-pointer",
                            dateFilter === option.value && "bg-accent"
                          )}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </div>
                    {/* Right Column - Date Picker */}
                    <div className="p-3">
                      {dateFilter === "custom" ? (
                        <div className="space-y-2">
                          <Calendar
                            mode="range"
                            selected={customDateRange?.from && customDateRange?.to ? { from: customDateRange.from, to: customDateRange.to } : undefined}
                            onSelect={(range) => {
                              setCustomDateRange(range);
                              if (range?.from && range?.to) {
                                setPage(1);
                                setOpenDropdowns((prev) => ({ ...prev, Date: false }));
                              }
                            }}
                            numberOfMonths={1}
                            className="rounded-md border"
                          />
                        </div>
                      ) : (
                        <div className="w-[280px] h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                          Select a date range option
                        </div>
                      )}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority Filter */}
              <DropdownMenu
                open={openDropdowns["Priority"] || false}
                onOpenChange={(open) => setOpenDropdowns((prev) => ({ ...prev, Priority: open }))}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("Priority")}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/80 hover:text-foreground dark:hover:text-foreground transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:outline-none rounded-sm px-2 py-1"
                  >
                    <span>Priority:</span>
                    <span className="font-medium">
                      {getFilterDisplayValue(priorityFilter, [
                        { value: "all", label: "All Priorities" },
                        ...FEEDBACK_PRIORITIES.map((p) => ({ value: p, label: p })),
                      ])}
                    </span>
                    {openDropdowns["Priority"] ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {[
                    { value: "all", label: "All Priorities" },
                    ...FEEDBACK_PRIORITIES.map((p) => ({ value: p, label: p })),
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        handleFilterValueChange("Priority", option.value, setPriorityFilter);
                        setPage(1);
                      }}
                      className={cn("cursor-pointer", priorityFilter === option.value && "bg-accent")}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Reason Filter */}
              <DropdownMenu
                open={openDropdowns["Reason"] || false}
                onOpenChange={(open) => setOpenDropdowns((prev) => ({ ...prev, Reason: open }))}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("Reason")}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/80 hover:text-foreground dark:hover:text-foreground transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:outline-none rounded-sm px-2 py-1"
                  >
                    <span>Reason:</span>
                    <span className="font-medium">
                      {getFilterDisplayValue(reasonFilter, [
                        { value: "all", label: "All Reasons" },
                        ...FEEDBACK_REASONS.map((r) => ({ value: r, label: r })),
                      ])}
                    </span>
                    {openDropdowns["Reason"] ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 max-h-[300px] overflow-y-auto">
                  {[
                    { value: "all", label: "All Reasons" },
                    ...FEEDBACK_REASONS.map((r) => ({ value: r, label: r })),
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        handleFilterValueChange("Reason", option.value, setReasonFilter);
                        setPage(1);
                      }}
                      className={cn("cursor-pointer", reasonFilter === option.value && "bg-accent")}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

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
            </div>
          </div>
        </div>
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
      }}>
        <DialogContent className="flex flex-col max-h-[90vh] p-0 sm:max-w-[38rem] lg:max-w-[40rem]">
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
          <div className="flex-1 px-6 py-4 overflow-y-auto scrollbar-thin min-h-0">
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
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setViewingFeedback(null);
                setReplyMessage("");
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
