"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  XCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FeedbackStats {
  total: number;
  recent: number;
  withReplies: number;
  withoutReplies: number;
  byStatus: { OPEN: number; IN_PROGRESS: number; RESOLVED: number; CLOSED: number };
  byPriority: { Urgent: number; High: number; Medium: number; Low: number };
  trends?: {
    date: string;
    count: number;
    open: number;
    resolved: number;
  }[];
  insights?: {
    oldestUnresolved?: {
      id: string;
      message: string;
      createdAt: string;
      daysOld: number;
    };
    averageResponseTime?: number;
    responseRate?: number;
    urgentWithoutReplies?: number;
  };
}

const statusChartConfig = {
  OPEN: { label: "Open", color: "hsl(221 83% 53%)" },
  IN_PROGRESS: { label: "In Progress", color: "hsl(25 95% 53%)" },
  RESOLVED: { label: "Resolved", color: "hsl(142 72% 45%)" },
  CLOSED: { label: "Closed", color: "hsl(0 0% 45%)" },
};

const priorityChartConfig = {
  Urgent: { label: "Urgent", color: "hsl(0 84% 60%)" },
  High: { label: "High", color: "hsl(25 95% 53%)" },
  Medium: { label: "Medium", color: "hsl(45 93% 47%)" },
  Low: { label: "Low", color: "hsl(221 83% 53%)" },
};

const trendChartConfig = {
  count: { label: "New Feedback", color: "hsl(221 83% 53%)" },
  open: { label: "Open", color: "hsl(221 83% 53%)" },
  resolved: { label: "Resolved", color: "hsl(142 72% 45%)" },
};

export function FeedbackStats() {
  const { data, isLoading } = useQuery<FeedbackStats>({
    queryKey: ["admin-feedback-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats/feedback");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 divide-x divide-y divide-border">
          {Array.from({ length: 12 }).map((_, i) => {
            const columnsPerRow = 4;
            const totalRows = Math.ceil(12 / columnsPerRow);
            const currentRow = Math.floor(i / columnsPerRow) + 1;
            const isLastRow = currentRow === totalRows;
            return (
              <div key={i} className={cn("p-4 sm:p-8", isLastRow && "border-b-0")}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            );
          })}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[320px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[320px] w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Insights Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data || {
    total: 0,
    recent: 0,
    withReplies: 0,
    withoutReplies: 0,
    byStatus: { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
    byPriority: { Urgent: 0, High: 0, Medium: 0, Low: 0 },
    trends: [],
    insights: {},
  };

  const statCards = [
    {
      label: "Total Feedback",
      value: stats.total,
      icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
      helper: "All feedback received",
    },
    {
      label: "Last 7 Days",
      value: stats.recent,
      icon: <Clock className="h-5 w-5 text-orange-500" />,
      helper: "New feedback this week",
    },
    {
      label: "Open",
      value: stats.byStatus.OPEN,
      icon: <AlertCircle className="h-5 w-5 text-blue-500" />,
      helper: "Awaiting response",
    },
    {
      label: "In Progress",
      value: stats.byStatus.IN_PROGRESS,
      icon: <Clock className="h-5 w-5 text-orange-500" />,
      helper: "Being worked on",
    },
    {
      label: "Resolved",
      value: stats.byStatus.RESOLVED,
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      helper: "Successfully resolved",
    },
    {
      label: "Closed",
      value: stats.byStatus.CLOSED,
      icon: <XCircle className="h-5 w-5 text-gray-500" />,
      helper: "Closed feedback",
    },
    {
      label: "Urgent",
      value: stats.byPriority.Urgent,
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      helper: "High priority items",
    },
    {
      label: "High Priority",
      value: stats.byPriority.High,
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      helper: "Important feedback",
    },
    {
      label: "Medium Priority",
      value: stats.byPriority.Medium,
      icon: <Info className="h-5 w-5 text-yellow-500" />,
      helper: "Moderate priority",
    },
    {
      label: "Low Priority",
      value: stats.byPriority.Low,
      icon: <Info className="h-5 w-5 text-blue-500" />,
      helper: "Low priority items",
    },
    {
      label: "With Replies",
      value: stats.withReplies,
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      helper: "Feedback with responses",
    },
    {
      label: "Without Replies",
      value: stats.withoutReplies,
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      helper: "Needs attention",
    },
  ];

  // Prepare chart data
  const statusChartData = Object.entries(stats.byStatus).map(([key, value]) => ({
    name: statusChartConfig[key as keyof typeof statusChartConfig]?.label || key,
    value,
    fill: statusChartConfig[key as keyof typeof statusChartConfig]?.color || "hsl(0 0% 50%)",
  }));

  const priorityChartData = Object.entries(stats.byPriority).map(([key, value]) => ({
    name: priorityChartConfig[key as keyof typeof priorityChartConfig]?.label || key,
    value,
    fill: priorityChartConfig[key as keyof typeof priorityChartConfig]?.color || "hsl(0 0% 50%)",
  }));

  const trendData = stats.trends || [];

  // Calculate response rate
  const responseRate = stats.total > 0 
    ? Math.round((stats.withReplies / stats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Feedback Statistics</h2>
        <p className="text-sm text-muted-foreground">
          Overview of feedback management and response metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border border-border rounded-lg overflow-hidden">
        {statCards.map((stat, index) => {
          const columnsPerRow = 4;
          const totalRows = Math.ceil(statCards.length / columnsPerRow);
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
              <div className="text-2xl font-bold mb-1">{stat.value.toLocaleString()}</div>
              <p className="text-[15px] text-muted-foreground">{stat.helper}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 mt-8">
        {/* Trends Chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Feedback Trends</CardTitle>
            <CardDescription>
              Daily feedback volume and resolution trends over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 sm:pl-4">
            {trendData.length > 0 ? (
              <ChartContainer config={trendChartConfig} className="h-[320px] w-full">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={{ strokeDasharray: "4 4" }}
                    content={<ChartTooltipContent />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    fill="var(--color-count)"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="open"
                    stroke="var(--color-open)"
                    fill="var(--color-open)"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stroke="var(--color-resolved)"
                    fill="var(--color-resolved)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>
              Breakdown by current status
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 sm:pl-4">
            {stats.total > 0 ? (
              <ChartContainer config={statusChartConfig} className="h-[320px] w-full">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="45%"
                    labelLine={true}
                    label={({ percent, value }) => {
                      // Only show percentage on pie, hide if too small
                      if (percent < 0.05 && value === 0) return "";
                      return `${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={70}
                    innerRadius={20}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number, name: string) => [
                      `${value} (${((value / stats.total) * 100).toFixed(1)}%)`,
                      name
                    ]}
                  />
                  <ChartLegend 
                    content={<ChartLegendContent />}
                    wrapperStyle={{ paddingTop: "20px" }}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Priority Chart */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Priority Distribution</CardTitle>
          <CardDescription>
            Feedback breakdown by priority level
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2 sm:pl-4">
          {stats.total > 0 ? (
            <ChartContainer config={priorityChartConfig} className="h-[280px] w-full">
              <BarChart data={priorityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={{ fill: "transparent" }}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Actionable Insights</CardTitle>
          <CardDescription>
            Key metrics and recommendations for feedback management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Response Rate */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  responseRate >= 80 ? "bg-green-500/10" : responseRate >= 50 ? "bg-yellow-500/10" : "bg-red-500/10"
                )}>
                  {responseRate >= 80 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : responseRate >= 50 ? (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Response Rate</p>
                  <p className="text-sm text-muted-foreground">
                    {responseRate}% of feedback has received replies
                  </p>
                </div>
              </div>
              <Badge variant={responseRate >= 80 ? "default" : responseRate >= 50 ? "secondary" : "destructive"}>
                {responseRate >= 80 ? "Excellent" : responseRate >= 50 ? "Good" : "Needs Improvement"}
              </Badge>
            </div>

            {/* Urgent Without Replies */}
            {stats.insights?.urgentWithoutReplies !== undefined && stats.insights.urgentWithoutReplies > 0 && (
              <div className="flex items-center justify-between p-4 border rounded-lg border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">Urgent Items Need Attention</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.insights.urgentWithoutReplies} urgent feedback items without replies
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/admin/forum?tab=feedback&priority=Urgent&replies=without">
                  <Button variant="outline" size="sm">
                    View Urgent
                  </Button>
                </Link>
              </div>
            )}

            {/* Oldest Unresolved */}
            {stats.insights?.oldestUnresolved && (
              <div className="flex items-center justify-between p-4 border rounded-lg border-yellow-500/20 bg-yellow-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-medium">Oldest Unresolved Feedback</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.insights.oldestUnresolved.daysOld} days old - {stats.insights.oldestUnresolved.message.substring(0, 50)}...
                    </p>
                  </div>
                </div>
                <Link href={`/dashboard/admin/forum?tab=feedback&id=${stats.insights.oldestUnresolved.id}`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            )}

            {/* Average Response Time */}
            {stats.insights?.averageResponseTime !== undefined && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Average Response Time</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.insights.averageResponseTime} hours average time to first reply
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {stats.insights.averageResponseTime < 24 ? "Fast" : stats.insights.averageResponseTime < 72 ? "Moderate" : "Slow"}
                </Badge>
              </div>
            )}

            {/* Without Replies Alert */}
            {stats.withoutReplies > 0 && (
              <div className="flex items-center justify-between p-4 border rounded-lg border-orange-500/20 bg-orange-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">Pending Responses</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.withoutReplies} feedback items waiting for replies
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/admin/forum?tab=feedback&replies=without">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
