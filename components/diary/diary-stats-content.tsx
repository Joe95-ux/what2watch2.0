"use client";

import { useMemo, useState } from "react";
import { useViewingLogs } from "@/hooks/use-viewing-logs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Film, Tv, Star, Calendar, TrendingUp, Award, Clock } from "lucide-react";
import { format, startOfYear, endOfYear, eachDayOfInterval, parseISO, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const COLORS = {
  movie: "hsl(221 83% 53%)",
  tv: "hsl(142 72% 45%)",
  rating5: "hsl(142 72% 45%)",
  rating4: "hsl(142 72% 45%)",
  rating3: "hsl(45 93% 47%)",
  rating2: "hsl(0 84% 60%)",
  rating1: "hsl(0 72% 51%)",
};

export default function DiaryStatsContent() {
  const { data: logs = [], isLoading } = useViewingLogs();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Get available years from logs
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    logs.forEach((log) => {
      const year = new Date(log.watchedAt).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [logs]);

  // Filter logs by selected year
  const filteredLogs = useMemo(() => {
    const year = parseInt(selectedYear, 10);
    return logs.filter((log) => {
      const logYear = new Date(log.watchedAt).getFullYear();
      return logYear === year;
    });
  }, [logs, selectedYear]);

  // Stats Overview
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const movies = filteredLogs.filter((log) => log.mediaType === "movie").length;
    const tv = filteredLogs.filter((log) => log.mediaType === "tv").length;
    const avgRating = filteredLogs
      .filter((log) => log.rating !== null)
      .reduce((sum, log) => sum + (log.rating || 0), 0) / 
      (filteredLogs.filter((log) => log.rating !== null).length || 1);
    const ratedCount = filteredLogs.filter((log) => log.rating !== null).length;
    const fiveStars = filteredLogs.filter((log) => log.rating === 5).length;
    const fourStars = filteredLogs.filter((log) => log.rating === 4).length;
    const threeStars = filteredLogs.filter((log) => log.rating === 3).length;
    const twoStars = filteredLogs.filter((log) => log.rating === 2).length;
    const oneStar = filteredLogs.filter((log) => log.rating === 1).length;

    return {
      total,
      movies,
      tv,
      avgRating: avgRating.toFixed(1),
      ratedCount,
      fiveStars,
      fourStars,
      threeStars,
      twoStars,
      oneStar,
    };
  }, [filteredLogs]);

  // Films by Month
  const filmsByMonth = useMemo(() => {
    const monthData: Record<string, { movies: number; tv: number }> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    months.forEach((month) => {
      monthData[month] = { movies: 0, tv: 0 };
    });

    filteredLogs.forEach((log) => {
      const month = format(new Date(log.watchedAt), "MMM");
      if (log.mediaType === "movie") {
        monthData[month].movies++;
      } else {
        monthData[month].tv++;
      }
    });

    return months.map((month) => ({
      month,
      movies: monthData[month].movies,
      tv: monthData[month].tv,
      total: monthData[month].movies + monthData[month].tv,
    }));
  }, [filteredLogs]);

  // Rating Distribution
  const ratingDistribution = useMemo(() => {
    return [
      { name: "5 Stars", value: stats.fiveStars, color: COLORS.rating5 },
      { name: "4 Stars", value: stats.fourStars, color: COLORS.rating4 },
      { name: "3 Stars", value: stats.threeStars, color: COLORS.rating3 },
      { name: "2 Stars", value: stats.twoStars, color: COLORS.rating2 },
      { name: "1 Star", value: stats.oneStar, color: COLORS.rating1 },
    ].filter((item) => item.value > 0);
  }, [stats]);

  // Films by Release Year
  const filmsByReleaseYear = useMemo(() => {
    const yearData: Record<number, number> = {};
    
    filteredLogs.forEach((log) => {
      const releaseYear = log.releaseDate 
        ? new Date(log.releaseDate).getFullYear() 
        : log.firstAirDate 
        ? new Date(log.firstAirDate).getFullYear() 
        : null;
      
      if (releaseYear) {
        yearData[releaseYear] = (yearData[releaseYear] || 0) + 1;
      }
    });

    return Object.entries(yearData)
      .map(([year, count]) => ({ year: parseInt(year, 10), count }))
      .sort((a, b) => a.year - b.year)
      .slice(-10); // Last 10 years
  }, [filteredLogs]);

  // Viewing Heatmap (Calendar)
  const heatmapData = useMemo(() => {
    const year = parseInt(selectedYear, 10);
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 11, 31));
    const days = eachDayOfInterval({ start, end });

    // Count logs per day
    const dayCounts: Record<string, number> = {};
    filteredLogs.forEach((log) => {
      const dayKey = format(new Date(log.watchedAt), "yyyy-MM-dd");
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    });

    // Group by week
    const weeks: Array<Array<{ date: Date; count: number; day: string }>> = [];
    let currentWeek: Array<{ date: Date; count: number; day: string }> = [];

    days.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const dayOfWeek = day.getDay();
      
      // Start new week on Sunday
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push({
        date: day,
        count: dayCounts[dayKey] || 0,
        day: format(day, "d"),
      });

      // If it's Saturday, push the week
      if (dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Add remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [filteredLogs, selectedYear]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-muted";
    if (count === 1) return "bg-blue-500/20";
    if (count === 2) return "bg-blue-500/40";
    if (count === 3) return "bg-blue-500/60";
    if (count >= 4) return "bg-blue-500";
    return "bg-muted";
  };

  const monthChartConfig = {
    movies: {
      label: "Movies",
      color: COLORS.movie,
    },
    tv: {
      label: "TV Shows",
      color: COLORS.tv,
    },
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Diary Stats</h1>
          <p className="text-muted-foreground">
            Visualize your viewing habits and statistics
          </p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Films</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.movies} movies, {stats.tv} TV shows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}</div>
            <p className="text-xs text-muted-foreground">
              {stats.ratedCount} of {stats.total} rated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">5-Star Films</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fiveStars}</div>
            <p className="text-xs text-muted-foreground">
              {stats.ratedCount > 0 ? ((stats.fiveStars / stats.ratedCount) * 100).toFixed(0) : 0}% of rated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Active Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filmsByMonth.reduce((max, month) => month.total > max.total ? month : max, filmsByMonth[0] || { month: "—", total: 0 }).month}
            </div>
            <p className="text-xs text-muted-foreground">
              {filmsByMonth.reduce((max, month) => month.total > max.total ? month : max, filmsByMonth[0] || { total: 0 }).total} films
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Films by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Films by Month</CardTitle>
            <CardDescription>Viewing activity throughout {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthChartConfig} className="h-[300px]">
              <BarChart data={filmsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="movies" fill={COLORS.movie} name="Movies" />
                <Bar dataKey="tv" fill={COLORS.tv} name="TV Shows" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>How you rated films in {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            {ratingDistribution.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={ratingDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {ratingDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No ratings yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Viewing Heatmap */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Viewing Heatmap</CardTitle>
          <CardDescription>Daily viewing activity in {selectedYear}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {heatmapData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={cn(
                        "w-3 h-3 rounded-sm",
                        getHeatmapColor(day.count),
                        day.count > 0 && "cursor-pointer hover:ring-2 hover:ring-ring"
                      )}
                      title={`${format(day.date, "MMM d, yyyy")}: ${day.count} ${day.count === 1 ? "film" : "films"}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <div className="w-3 h-3 rounded-sm bg-blue-500/20" />
                <div className="w-3 h-3 rounded-sm bg-blue-500/40" />
                <div className="w-3 h-3 rounded-sm bg-blue-500/60" />
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
              </div>
              <span>More</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Films by Release Year */}
      {filmsByReleaseYear.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Films by Release Year</CardTitle>
            <CardDescription>Release years of films you watched in {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <BarChart data={filmsByReleaseYear}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill={COLORS.movie} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

