"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Link2,
  ExternalLink,
  Settings,
  MousePointer,
  ChevronDown,
  ChevronUp,
  Bell,
  Eye,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

type DateFilter = "today" | "yesterday" | "3" | "7" | "15" | "30" | "custom";

type AnalyticsResponse = {
  totals: { views: number; clicks: number; ctr: number; avgTimeToClick: number | null };
  daily: Array<{
    date: string;
    dateKey: string;
    totalViews: number;
    uniqueViews: number;
    totalClicks: number;
    uniqueClicks: number;
    ctr: number;
  }>;
  notificationSentDates: string[];
  links: Array<{ id: string; label: string; url: string; clicks: number }>;
};

const KPI_COLORS = {
  views: { bg: "bg-blue-500/15", dot: "bg-blue-500", label: "Total views" },
  clicks: { bg: "bg-emerald-500/15", dot: "bg-emerald-500", label: "Total clicks" },
  ctr: { bg: "bg-amber-500/15", dot: "bg-amber-500", label: "CTR" },
  avgTime: { bg: "bg-violet-500/15", dot: "bg-violet-500", label: "Avg. time to click" },
};

const CHART_COLORS = {
  totalViews: "#3b82f6",
  uniqueViews: "#60a5fa",
  totalClicks: "#10b981",
  uniqueClicks: "#34d399",
  ctr: "#f59e0b",
};

export function LinkPageAnalyticsContent() {
  const { data: currentUser } = useCurrentUser();
  const [dateFilter, setDateFilter] = useState<DateFilter>("7");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date } | undefined>(undefined);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  const getDateRange = () => {
    if (dateFilter === "custom" && customDateRange?.from && customDateRange?.to) {
      return {
        from: customDateRange.from.toISOString(),
        to: customDateRange.to.toISOString(),
      };
    }
    const now = new Date();
    const days = dateFilter === "7" ? 7 : dateFilter === "90" ? 90 : dateFilter === "365" ? 365 : 30;
    return {
      from: startOfDay(subDays(now, days)).toISOString(),
      to: endOfDay(now).toISOString(),
    };
  };

  const dateRange = getDateRange();
  const queryKey =
    dateFilter === "custom"
      ? ["link-page-analytics", dateRange.from, dateRange.to]
      : ["link-page-analytics", dateFilter];

  const { data, isLoading } = useQuery<AnalyticsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter === "custom" && dateRange.from && dateRange.to) {
        params.set("from", dateRange.from);
        params.set("to", dateRange.to);
      } else {
        params.set("range", dateFilter);
      }
      const res = await fetch(`/api/user/link-page/analytics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const getDateFilterDisplay = () => {
    if (dateFilter === "custom" && customDateRange?.from && customDateRange?.to) {
      return `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d, yyyy")}`;
    }
    const labels: Record<string, string> = {
      "today": "Today",
      "yesterday": "Yesterday",
      "3": "Last 3 Days",
      "7": "Last 7 Days",
      "15": "Last 15 Days",
      "30": "Last 30 Days",
    };
    return labels[dateFilter] || "Last 7 Days";
  };

  // Sync calendar with selected preset so the range is visible on the right
  const calendarSelectedRange = (() => {
    if (dateFilter === "custom" && customDateRange?.from && customDateRange?.to) {
      return { from: customDateRange.from, to: customDateRange.to };
    }
    const now = new Date();
    let from: Date;
    let to: Date = endOfDay(now);
    switch (dateFilter) {
      case "today":
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case "yesterday":
        from = startOfDay(subDays(now, 1));
        to = endOfDay(subDays(now, 1));
        break;
      case "3":
        from = startOfDay(subDays(now, 3));
        break;
      case "7":
        from = startOfDay(subDays(now, 7));
        break;
      case "15":
        from = startOfDay(subDays(now, 15));
        break;
      case "30":
        from = startOfDay(subDays(now, 30));
        break;
      default:
        return undefined;
    }
    return { from, to };
  })();

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-border rounded-lg overflow-hidden">
          {[1, 2, 3, 4].map((i) => {
            const columnsPerRow = 4;
            const totalRows = Math.ceil(4 / columnsPerRow);
            const currentRow = Math.floor((i - 1) / columnsPerRow) + 1;
            const isLastRow = currentRow === totalRows;
            const isLastColumn = i % columnsPerRow === 0;
            
            return (
              <div
                key={i}
                className={cn(
                  "p-4 sm:p-8 border-r border-b border-border",
                  isLastColumn && "border-r-0",
                  isLastRow && "border-b-0"
                )}
              >
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            );
          })}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[320px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <Skeleton className="h-[200px] w-full" />
        </Card>
      </div>
    );
  }

  const totals = data?.totals ?? { views: 0, clicks: 0, ctr: 0, avgTimeToClick: null };
  const daily = data?.daily ?? [];
  const notificationSentDates = new Set(data?.notificationSentDates ?? []);
  const links = data?.links ?? [];

  return (
    <div className="w-full space-y-6">
      {/* Header + Date picker + Icon buttons */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Link page analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Views, clicks, and CTR over time. Get notified when activity peaks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu open={dateDropdownOpen} onOpenChange={setDateDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer whitespace-nowrap rounded-[10px] px-2 py-1.5 border bg-background focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <span>Date:</span>
                <span className="font-medium">{getDateFilterDisplay()}</span>
                {dateDropdownOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto p-0 rounded-[25px]">
              <div className="flex flex-col sm:flex-row">
                <div className="border-b sm:border-b-0 sm:border-r p-[10px] min-w-[180px]">
                  {[
                    { value: "today" as const, label: "Today" },
                    { value: "yesterday" as const, label: "Yesterday" },
                    { value: "3" as const, label: "Last 3 Days" },
                    { value: "7" as const, label: "Last 7 Days" },
                    { value: "15" as const, label: "Last 15 Days" },
                    { value: "30" as const, label: "Last 30 Days" },
                    { value: "custom" as const, label: "Custom Range" },
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        if (option.value === "custom") {
                          setDateFilter("custom");
                        } else {
                          setDateFilter(option.value);
                          setCustomDateRange(undefined);
                          setDateDropdownOpen(false);
                        }
                      }}
                      className={cn("cursor-pointer rounded-[12px]", dateFilter === option.value && "bg-accent")}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </div>
                <div className="p-3">
                  <Calendar
                    mode="range"
                    selected={calendarSelectedRange}
                    onSelect={(range) => {
                      if (range) {
                        setCustomDateRange(range);
                        setDateFilter("custom");
                        if (range.from && range.to) {
                          setDateDropdownOpen(false);
                        }
                      }
                    }}
                    numberOfMonths={1}
                    className="rounded-[15px] border-none"
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {currentUser?.username && (
            <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-full cursor-pointer shrink-0">
              <Link
                href={`/links/${currentUser.username}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View link page"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-full cursor-pointer shrink-0">
            <Link href="/settings?section=links" title="Edit links">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-border rounded-lg overflow-hidden">
        {[
          {
            label: KPI_COLORS.views.label,
            value: totals.views.toLocaleString(),
            icon: <Eye className="h-5 w-5 text-blue-500" />,
            helper: "Total page views",
          },
          {
            label: KPI_COLORS.clicks.label,
            value: totals.clicks.toLocaleString(),
            icon: <MousePointer className="h-5 w-5 text-emerald-500" />,
            helper: "Total link clicks",
          },
          {
            label: KPI_COLORS.ctr.label,
            value: `${totals.ctr.toFixed(1)}%`,
            icon: <TrendingUp className="h-5 w-5 text-amber-500" />,
            helper: "Click-through rate",
          },
          {
            label: KPI_COLORS.avgTime.label,
            value: totals.avgTimeToClick != null ? `${totals.avgTimeToClick}s` : "—",
            icon: <Clock className="h-5 w-5 text-violet-500" />,
            helper: "Average time to click",
          },
        ].map((stat, index) => {
          const columnsPerRow = 4;
          const totalRows = Math.ceil(4 / columnsPerRow);
          const currentRow = Math.floor(index / columnsPerRow) + 1;
          const isLastRow = currentRow === totalRows;
          const isLastColumn = (index + 1) % columnsPerRow === 0;
          
          return (
            <div
              key={stat.label}
              className={cn(
                "p-4 sm:p-8 border-r border-b border-border",
                isLastColumn && "border-r-0",
                isLastRow && "border-b-0"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </span>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <p className="text-[15px] text-muted-foreground">{stat.helper}</p>
            </div>
          );
        })}
      </div>

      {/* Combo chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily activity</CardTitle>
          <CardDescription>
            Total views, unique views, total clicks, unique clicks, and CTR. Peak notifications are marked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: "600px" }}>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={daily} margin={{ top: 10, right: 50, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "CTR") return [`${value}%`, name];
                      return [value, name];
                    }}
                    labelFormatter={(label) => label}
                  />
                  <Bar yAxisId="left" dataKey="totalViews" fill={CHART_COLORS.totalViews} name="Total views" barSize={24} />
                  <Bar yAxisId="left" dataKey="uniqueViews" fill={CHART_COLORS.uniqueViews} name="Unique views" barSize={24} />
                  <Bar yAxisId="left" dataKey="totalClicks" fill={CHART_COLORS.totalClicks} name="Total clicks" barSize={24} />
                  <Bar yAxisId="left" dataKey="uniqueClicks" fill={CHART_COLORS.uniqueClicks} name="Unique clicks" barSize={24} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="ctr"
                    stroke={CHART_COLORS.ctr}
                    strokeWidth={2}
                    name="CTR"
                    dot={{ r: 3 }}
                  />
                  {daily.map((d, i) =>
                    notificationSentDates.has(d.dateKey) ? (
                      <ReferenceDot
                        key={d.dateKey}
                        yAxisId="left"
                        x={d.date}
                        y={0}
                        r={6}
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ) : null
                  )}
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          {notificationSentDates.size > 0 && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              Peak notification sent on marked day(s).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clicks by link</CardTitle>
          <CardDescription>All-time clicks per link from your link page.</CardDescription>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <div className="py-8 text-center">
              <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 block" />
              <p className="text-sm text-muted-foreground">No links yet. Add links in Settings.</p>
              <Button asChild className="mt-3 cursor-pointer">
                <Link href="/settings?section=links">Link in bio settings</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead className="text-right w-[120px]">Clicks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{link.label}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[280px] sm:max-w-none" title={link.url}>
                          {link.url}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                        {link.clicks ?? 0}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
