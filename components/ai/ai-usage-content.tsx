"use client";

import { useState, useMemo, useEffect } from "react";
import { useAiAnalytics, useAiAnalyticsEvents } from "@/hooks/use-ai-analytics";
import { useAllGenres } from "@/hooks/use-genres";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Activity, MessageSquare, Sparkles, TrendingUp, Clock, MousePointerClick, Plus, Users, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download, MoreHorizontal } from "lucide-react";
import { format, subDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function AiUsageContent() {
  const [quickRange, setQuickRange] = useState<"1d" | "7d" | "30d">("30d");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(undefined);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Calculate date range parameters
  const getDateParams = () => {
    const now = new Date();
    let range: number | undefined;
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (customStartDate && customEndDate) {
      // Custom date range is active
      startDate = format(customStartDate, "yyyy-MM-dd");
      endDate = format(customEndDate, "yyyy-MM-dd");
    } else {
      // Use quick range
      if (quickRange === "1d") {
        range = 1;
      } else if (quickRange === "7d") {
        range = 7;
      } else if (quickRange === "30d") {
        range = 30;
      }
    }

    return { range, startDate, endDate };
  };

  const { range, startDate, endDate } = getDateParams();

  // Get display text for date range
  const getDateRangeDisplay = () => {
    if (customStartDate && customEndDate) {
      return `${format(customStartDate, "MMM d")} - ${format(customEndDate, "MMM d, yyyy")}`;
    }
    const now = new Date();
    if (quickRange === "1d") {
      return format(now, "MMM d, yyyy");
    } else if (quickRange === "7d") {
      const start = subDays(now, 6);
      return `${format(start, "MMM d")} - ${format(now, "MMM d, yyyy")}`;
    } else if (quickRange === "30d") {
      const start = subDays(now, 29);
      return `${format(start, "MMM d")} - ${format(now, "MMM d, yyyy")}`;
    }
    return "";
  };

  // Handle calendar apply
  const handleApplyDateRange = () => {
    if (tempStartDate && tempEndDate) {
      setCustomStartDate(tempStartDate);
      setCustomEndDate(tempEndDate);
      setIsCalendarOpen(false);
    }
  };

  // Handle calendar cancel
  const handleCancelDateRange = () => {
    setTempStartDate(customStartDate);
    setTempEndDate(customEndDate);
    setIsCalendarOpen(false);
  };

  // Reset custom range when quick range changes
  useEffect(() => {
    if (quickRange) {
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  }, [quickRange]);
  
  const { data, isLoading, isError, error } = useAiAnalytics({
    range,
    startDate,
    endDate,
  });
  
  const { data: eventsData, isLoading: isLoadingEvents } = useAiAnalyticsEvents({
    page: currentPage,
    range,
    startDate,
    endDate,
  });
  
  const { data: allGenres = [] } = useAllGenres();

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [quickRange, customStartDate, customEndDate]);

  // Initialize temp dates when calendar opens
  useEffect(() => {
    if (isCalendarOpen) {
      setTempStartDate(customStartDate);
      setTempEndDate(customEndDate);
    }
  }, [isCalendarOpen, customStartDate, customEndDate]);

  // Create genre ID to name map
  const genreMap = useMemo(() => {
    const map = new Map<number, string>();
    allGenres.forEach((genre) => {
      map.set(genre.id, genre.name);
    });
    return map;
  }, [allGenres]);

  const trendData = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: item.count,
    }));
  }, [data?.trend]);

  // Generate page numbers with ellipsis for pagination
  const pageNumbers = useMemo(() => {
    const totalPages = eventsData?.pagination.totalPages || 1;
    const pages: (number | "ellipsis")[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Add ellipsis if current page is far from start
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      
      // Add pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      // Add ellipsis if current page is far from end
      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  }, [currentPage, eventsData?.pagination.totalPages]);

  // CSV export function - fetches all events for the current filter
  const handleExportCSV = async () => {
    try {
      // Fetch all events (no pagination) for CSV export
      const searchParams = new URLSearchParams();
      searchParams.set("page", "1");
      searchParams.set("pageSize", "10000"); // Large number to get all events
      if (range) {
        searchParams.set("range", range.toString());
      }
      if (startDate) {
        searchParams.set("startDate", startDate);
      }
      if (endDate) {
        searchParams.set("endDate", endDate);
      }

      const response = await fetch(`/api/ai/analytics/events?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch events for export");
      }
      const data = await response.json();

      if (!data.events || data.events.length === 0) {
        return;
      }

      const headers = ["Date", "Type", "Model", "Prompt Tokens", "Completion Tokens", "Total Tokens", "Response Time (ms)", "User Message"];
      const rows: string[][] = data.events.map((event: any) => [
        format(new Date(event.createdAt), "MMM d, yyyy h:mm a"),
        event.intent === "RECOMMENDATION" ? "Recommendation" : "Information",
        event.model || "N/A",
        event.promptTokens?.toString() || "N/A",
        event.completionTokens?.toString() || "N/A",
        event.totalTokens?.toString() || "N/A",
        event.responseTime?.toString() || "N/A",
        event.userMessage,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `ai-usage-${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export CSV:", error);
      toast.error("Failed to export CSV");
    }
  };

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load analytics: {error?.message || "Unknown error"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">AI Usage</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Picker */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[220px] justify-start text-left font-normal cursor-pointer">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {getDateRangeDisplay() || "Select date range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={tempStartDate || new Date()}
                  selected={{
                    from: tempStartDate,
                    to: tempEndDate,
                  }}
                  onSelect={(range) => {
                    if (range?.from) {
                      setTempStartDate(range.from);
                    }
                    if (range?.to) {
                      setTempEndDate(range.to);
                    }
                  }}
                  numberOfMonths={1}
                />
              </div>
              <div className="flex items-center justify-end gap-2 p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelDateRange}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyDateRange}
                  disabled={!tempStartDate || !tempEndDate}
                  className="cursor-pointer"
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Quick Range Dropdown */}
          <Select value={quickRange} onValueChange={(value) => setQuickRange(value as "1d" | "7d" | "30d")}>
            <SelectTrigger className="w-full sm:w-[100px] cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d" className="cursor-pointer">1d</SelectItem>
              <SelectItem value="7d" className="cursor-pointer">7d</SelectItem>
              <SelectItem value="30d" className="cursor-pointer">30d</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <MetricCard
          title="Total Queries"
          value={data?.totals.totalQueries ?? 0}
          icon={MessageSquare}
          isLoading={isLoading}
        />
        <MetricCard
          title="Recommendations"
          value={data?.totals.recommendationQueries ?? 0}
          icon={Sparkles}
          isLoading={isLoading}
        />
        <MetricCard
          title="Information Queries"
          value={data?.totals.informationQueries ?? 0}
          icon={Activity}
          isLoading={isLoading}
        />
        <MetricCard
          title="Unique Sessions"
          value={data?.totals.uniqueSessions ?? 0}
          icon={Users}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <MetricCard
          title="Total Results"
          value={data?.totals.totalResults ?? 0}
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <MetricCard
          title="Results Clicked"
          value={data?.totals.totalClicks ?? 0}
          icon={MousePointerClick}
          isLoading={isLoading}
        />
        <MetricCard
          title="Added to Playlist"
          value={data?.totals.totalPlaylistAdds ?? 0}
          icon={Plus}
          isLoading={isLoading}
        />
        <MetricCard
          title="Avg Response Time"
          value={data?.totals.averageResponseTime ? `${Math.round(data.totals.averageResponseTime / 1000)}s` : "0s"}
          icon={Clock}
          isLoading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Query Trends</CardTitle>
            <CardDescription>Number of queries over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] sm:h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Genres</CardTitle>
            <CardDescription>Most requested genres</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] sm:h-[300px] w-full" />
            ) : data?.topGenres && data.topGenres.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={data.topGenres.map((g) => ({
                    ...g,
                    genreName: genreMap.get(g.genreId) || `Genre ${g.genreId}`,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="genreName" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground">
                No genre data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Table */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>AI Chat Events & Token Usage</CardTitle>
              <CardDescription>Detailed breakdown of AI interactions and token consumption.</CardDescription>
            </div>
            {eventsData?.events && eventsData.events.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEvents ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : eventsData?.events && eventsData.events.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Prompt Tokens</TableHead>
                      <TableHead className="text-right">Completion Tokens</TableHead>
                      <TableHead className="text-right">Total Tokens</TableHead>
                      <TableHead className="text-right">Response Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsData.events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(event.createdAt), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={event.intent === "RECOMMENDATION" ? "default" : "secondary"}
                            className={event.intent === "INFORMATION" ? "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30" : ""}
                          >
                            {event.intent === "RECOMMENDATION" ? "Recommendation" : "Information"}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.model || "N/A"}</TableCell>
                        <TableCell className="text-right">{event.promptTokens?.toLocaleString() || "N/A"}</TableCell>
                        <TableCell className="text-right">{event.completionTokens?.toLocaleString() || "N/A"}</TableCell>
                        <TableCell className="text-right">{event.totalTokens?.toLocaleString() || "N/A"}</TableCell>
                        <TableCell className="text-right">{event.responseTime ? `${event.responseTime}ms` : "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {eventsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-end py-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="h-9 w-9"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only">Previous page</span>
                        </Button>
                      </PaginationItem>
                      {pageNumbers.map((page, index) => {
                        if (page === "ellipsis") {
                          return (
                            <PaginationItem key={`ellipsis-${index}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return (
                          <PaginationItem key={page}>
                            <Button
                              variant={currentPage === page ? "outline" : "ghost"}
                              size="icon"
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "h-9 w-9",
                                currentPage === page && "bg-primary text-primary-foreground"
                              )}
                            >
                              {page}
                            </Button>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCurrentPage((prev) => Math.min(eventsData.pagination.totalPages, prev + 1))}
                          disabled={currentPage === eventsData.pagination.totalPages}
                          className="h-9 w-9"
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">Next page</span>
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No AI chat events found for the selected period.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Keywords */}
      {data?.topKeywords && data.topKeywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Keywords</CardTitle>
            <CardDescription>Most common search keywords</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.topKeywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"
                >
                  {keyword.keyword} ({keyword.count})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}


