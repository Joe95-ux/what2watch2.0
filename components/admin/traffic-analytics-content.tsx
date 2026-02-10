"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Globe, UsersRound, Eye, TrendingUp, Monitor, Smartphone, Tablet, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { WorldMapHeatmap } from "@/components/admin/world-map-heatmap";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimplePagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

countries.registerLocale(en);

interface TrafficAnalytics {
  totals: {
    pageViews: number;
    uniqueVisitors: number;
    uniqueSessions: number;
  };
  topPages: Array<{ path: string; views: number }>;
  countries: Array<{ country: string; views: number }>;
  sources: Array<{ domain: string; views: number }>;
  utmSources: Array<{ source: string; views: number }>;
  devices: Array<{ deviceType: string; views: number }>;
  trend: Array<{ date: string; views: number }>;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#0088fe"];

export function TrafficAnalyticsContent() {
  const [dateFilter, setDateFilter] = useState<"7" | "30" | "90" | "365" | "custom">("30");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date } | undefined>(undefined);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [sourcesPage, setSourcesPage] = useState(1);
  const [countriesPage, setCountriesPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate date range for API
  const getDateRange = () => {
    if (dateFilter === "custom" && customDateRange?.from && customDateRange?.to) {
      return {
        from: customDateRange.from.toISOString(),
        to: customDateRange.to.toISOString(),
      };
    }
    const now = new Date();
    let from: Date;
    switch (dateFilter) {
      case "7":
        from = startOfDay(subDays(now, 7));
        break;
      case "30":
        from = startOfDay(subDays(now, 30));
        break;
      case "90":
        from = startOfDay(subDays(now, 90));
        break;
      case "365":
        from = startOfDay(subDays(now, 365));
        break;
      default:
        from = startOfDay(subDays(now, 30));
    }
    return {
      from: from.toISOString(),
      to: endOfDay(now).toISOString(),
    };
  };

  const dateRange = getDateRange();
  const queryKey = dateFilter === "custom" 
    ? ["traffic-analytics", dateRange.from, dateRange.to]
    : ["traffic-analytics", dateFilter];

  const { data, isLoading } = useQuery<TrafficAnalytics>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter === "custom" && dateRange.from && dateRange.to) {
        params.append("from", dateRange.from);
        params.append("to", dateRange.to);
      } else {
        params.append("range", dateFilter);
      }
      const res = await fetch(`/api/analytics/traffic?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch traffic analytics");
      return res.json();
    },
  });

  const getDateFilterDisplay = () => {
    if (dateFilter === "custom" && customDateRange?.from && customDateRange?.to) {
      return `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d, yyyy")}`;
    }
    const labels: Record<string, string> = {
      "7": "Last 7 Days",
      "30": "Last 30 Days",
      "90": "Last 90 Days",
      "365": "Last Year",
    };
    return labels[dateFilter] || "Last 30 Days";
  };

  // Sync calendar with selected preset so the range is visible on the right
  const calendarSelectedRange = (() => {
    if (dateFilter === "custom" && customDateRange?.from && customDateRange?.to) {
      return { from: customDateRange.from, to: customDateRange.to };
    }
    if (dateFilter === "custom") return undefined;
    const now = new Date();
    let from: Date;
    switch (dateFilter) {
      case "7":
        from = startOfDay(subDays(now, 7));
        break;
      case "30":
        from = startOfDay(subDays(now, 30));
        break;
      case "90":
        from = startOfDay(subDays(now, 90));
        break;
      case "365":
        from = startOfDay(subDays(now, 365));
        break;
      default:
        return undefined;
    }
    return { from, to: endOfDay(now) };
  })();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="self-end md:self-auto">
            <Skeleton className="h-10 w-[140px]" />
          </div>
        </div>
        
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trend Chart Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>

        {/* World Map Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[500px] w-full" />
          </CardContent>
        </Card>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No traffic data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Website Traffic Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track visits, visitors, and traffic sources
          </p>
        </div>
        <div className="self-end md:self-auto">
          <DropdownMenu open={dateDropdownOpen} onOpenChange={setDateDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/80 hover:text-foreground dark:hover:text-foreground transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:outline-none rounded-sm px-2 py-1"
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
          <DropdownMenuContent align="end" className="w-auto p-0 rounded-[25px] dark:bg-[#000000]">
            <div className="flex flex-col sm:flex-row">
              {/* Left Column - Days List */}
              <div className="border-b sm:border-b-0 sm:border-r p-[10px] min-w-[180px]">
                {[
                  { value: "7", label: "Last 7 Days" },
                  { value: "30", label: "Last 30 Days" },
                  { value: "90", label: "Last 90 Days" },
                  { value: "365", label: "Last Year" },
                  { value: "custom", label: "Custom Range" },
                ].map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => {
                      if (option.value === "custom") {
                        setDateFilter("custom");
                      } else {
                        setDateFilter(option.value as typeof dateFilter);
                        setCustomDateRange(undefined);
                        setDateDropdownOpen(false);
                      }
                    }}
                    className={cn(
                      "cursor-pointer rounded-[12px]",
                      dateFilter === option.value && "bg-accent"
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </div>
              {/* Right Column - Date Picker */}
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Eye className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.pageViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All page views in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <UsersRound className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.uniqueVisitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unique visitor tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.uniqueSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unique sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Page Views Trend</CardTitle>
          <CardDescription>Daily page views over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div style={{ minWidth: "600px" }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* World Map Heat Map */}
      {data.countries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Traffic by Country - World Map
            </CardTitle>
            <CardDescription>Geographic distribution of website traffic</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <div className="flex flex-row gap-4 h-[500px] min-w-max">
                {/* Country Traffic Table - Left Side */}
                <div className="w-120 flex flex-col flex-shrink-0">
                <div className="p-4 border-b">
                  <h3 className="text-base font-semibold">Top Countries</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {(() => {
                    const sortedCountries = [...data.countries].sort((a, b) => b.views - a.views);
                    const totalPages = Math.ceil(sortedCountries.length / itemsPerPage);
                    const startIndex = (countriesPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedCountries = sortedCountries.slice(startIndex, endIndex);
                    
                    return (
                      <>
                        <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Country</TableHead>
                                <TableHead className="text-right">Views</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedCountries.map((country, index) => {
                                const countryCode = country.country?.toUpperCase() || "";
                                const countryName = countries.getName(countryCode, "en") || countryCode || "Unknown";
                                const showCode = countryCode.length === 2;
                                const globalIndex = startIndex + index;
                                return (
                                  <TableRow key={country.country}>
                                    <TableCell className="text-muted-foreground">
                                      {globalIndex + 1}
                                    </TableCell>
                                    <TableCell>
                                      {countryName} {showCode && `(${countryCode})`}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {country.views.toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        {totalPages > 1 && (
                          <div className="p-4 border-t">
                            <SimplePagination
                              currentPage={countriesPage}
                              totalPages={totalPages}
                              onPageChange={setCountriesPage}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
                {/* Map - Right Side */}
                <div className="flex-1 overflow-hidden mr-4 flex-shrink-0" style={{ minHeight: "450px", minWidth: "600px" }}>
                  <WorldMapHeatmap
                    countries={data.countries}
                    maxViews={Math.max(...data.countries.map((c) => c.views), 0)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div style={{ minWidth: "600px" }}>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={data.topPages.slice(0, 10)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="path" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Countries */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic by Country</CardTitle>
            <CardDescription>Top countries by page views</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div style={{ minWidth: "600px" }}>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={data.countries.slice(0, 6)}
                      dataKey="views"
                      nameKey="country"
                      cx="50%"
                      cy="50%"
                      outerRadius={140}
                      label={({ country, percent }) => 
                        `${country}\n${(percent * 100).toFixed(1)}%`
                      }
                      labelLine={true}
                      stroke="none"
                    >
                      {data.countries.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${value.toLocaleString()} views`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Top referrer domains</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const totalPages = Math.ceil(data.sources.length / itemsPerPage);
              const startIndex = (sourcesPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedSources = data.sources.slice(startIndex, endIndex);
              
              return (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSources.map((source) => (
                        <TableRow key={source.domain}>
                          <TableCell>{source.domain || "Direct"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {source.views.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSourcesPage(Math.max(1, sourcesPage - 1))}
                        disabled={sourcesPage === 1}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            return page === 1 || 
                                   page === totalPages || 
                                   (page >= sourcesPage - 1 && page <= sourcesPage + 1);
                          })
                          .map((page, index, array) => {
                            const showEllipsisBefore = index > 0 && array[index - 1] < page - 1;
                            return (
                              <div key={page} className="flex items-center gap-1">
                                {showEllipsisBefore && <span className="text-muted-foreground px-2">...</span>}
                                <Button
                                  variant={sourcesPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSourcesPage(page)}
                                  className="cursor-pointer min-w-[2.5rem]"
                                >
                                  {page}
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSourcesPage(Math.min(totalPages, sourcesPage + 1))}
                        disabled={sourcesPage === totalPages}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Device Types */}
        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
            <CardDescription>Traffic by device</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div style={{ minWidth: "600px" }}>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={data.devices}
                      dataKey="views"
                      nameKey="deviceType"
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      cornerRadius={8}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {data.devices.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${value.toLocaleString()} views`,
                        name.charAt(0).toUpperCase() + name.slice(1)
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Custom Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              {data.devices.map((device, index) => (
                <div key={device.deviceType} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm capitalize">{device.deviceType}</span>
                  <span className="text-sm text-muted-foreground">
                    ({device.views.toLocaleString()})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* UTM Sources */}
      {data.utmSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>UTM Sources</CardTitle>
            <CardDescription>Traffic from UTM campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.utmSources.map((utm) => (
                <div key={utm.source} className="flex items-center justify-between">
                  <span className="text-sm">{utm.source}</span>
                  <span className="text-sm font-medium">{utm.views.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

