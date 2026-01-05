"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Globe,
  UsersRound,
  Eye,
  TrendingUp,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { WorldMapHeatmap } from "@/components/admin/world-map-heatmap";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

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

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00ff00",
  "#0088fe",
];

export function TrafficAnalyticsContent() {
  const [range, setRange] = useState("30");

  const { data, isLoading } = useQuery<TrafficAnalytics>({
    queryKey: ["traffic-analytics", range],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/traffic?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch traffic analytics");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-[140px]" />
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Website Traffic Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track visits, visitors, and traffic sources
          </p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Page Views
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totals.pageViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All page views in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unique Visitors
            </CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totals.uniqueVisitors.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique visitor tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totals.uniqueSessions.toLocaleString()}
            </div>
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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#8884d8"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
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
            <CardDescription>
              Geographic distribution of website traffic
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden p-0">
            <div className="flex gap-4 h-[500px]">
              {/* Country Traffic Table - Left Side */}
              <div className="w-90 overflow-y-auto">
                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-background p-2">
                    Top Countries
                  </h3>
                  <div className="space-y-1">
                    {data.countries
                      .sort((a, b) => b.views - a.views)
                      .slice(0, 20)
                      .map((country, index) => {
                        const countryCode =
                          country.country?.toUpperCase() || "";
                        const countryName =
                          countries.getName(countryCode, "en") ||
                          countryCode ||
                          "Unknown";
                        const showCode = countryCode.length === 2;
                        return (
                          <div
                            key={country.country}
                            className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xs text-muted-foreground w-5 flex-shrink-0">
                                {index + 1}
                              </span>
                              <span className="text-sm">
                                {countryName} {showCode && `(${countryCode})`}
                              </span>
                            </div>
                            <span className="text-sm font-medium ml-2 flex-shrink-0">
                              {country.views.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Map - Right Side */}
              <div
                className="flex-1 overflow-hidden mr-4"
                style={{ minHeight: "450px" }}
              >
                <WorldMapHeatmap
                  countries={data.countries}
                  maxViews={Math.max(...data.countries.map((c) => c.views), 0)}
                />
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topPages.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="path"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="views" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Countries */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic by Country</CardTitle>
            <CardDescription>Top countries by page views</CardDescription>
          </CardHeader>
          <CardContent>
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
                >
                  {data.countries.slice(0, 6).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} views`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Top referrer domains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.sources.slice(0, 10).map((source) => (
                <div
                  key={source.domain}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{source.domain || "Direct"}</span>
                  <span className="text-sm font-medium">
                    {source.views.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Device Types */}
        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
            <CardDescription>Traffic by device</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                {data.devices.map((device) => {
                  const totalViews = data.devices.reduce(
                    (sum, d) => sum + d.views,
                    0
                  );
                  const percentage =
                    totalViews > 0 ? (device.views / totalViews) * 100 : 0;

                  const getDeviceConfig = () => {
                    switch (device.deviceType) {
                      case "desktop":
                        return {
                          icon: Monitor,
                          bgColor: "bg-blue-50 dark:bg-blue-900/20",
                          iconColor: "text-blue-600 dark:text-blue-400",
                          barColor: "bg-blue-500",
                          label: "Desktop",
                        };
                      case "mobile":
                        return {
                          icon: Smartphone,
                          bgColor: "bg-green-50 dark:bg-green-900/20",
                          iconColor: "text-green-600 dark:text-green-400",
                          barColor: "bg-green-500",
                          label: "Mobile",
                        };
                      case "tablet":
                        return {
                          icon: Tablet,
                          bgColor: "bg-purple-50 dark:bg-purple-900/20",
                          iconColor: "text-purple-600 dark:text-purple-400",
                          barColor: "bg-purple-500",
                          label: "Tablet",
                        };
                      default:
                        return {
                          icon: Monitor,
                          bgColor: "bg-gray-50 dark:bg-gray-900/20",
                          iconColor: "text-gray-600 dark:text-gray-400",
                          barColor: "bg-gray-500",
                          label: device.deviceType,
                        };
                    }
                  };

                  const config = getDeviceConfig();
                  const Icon = config.icon;

                  return (
                    <div key={device.deviceType} className="text-center">
                      <div className={`${config.bgColor} p-3 rounded-lg mb-3`}>
                        <Icon
                          className={`h-6 w-6 mx-auto ${config.iconColor}`}
                        />
                      </div>
                      <p className="text-sm font-medium mb-1">{config.label}</p>
                      <p className="text-xl font-bold">
                        {percentage.toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {device.views.toLocaleString()} views
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Donut Chart */}
              <div className="relative">
                <div className="aspect-square relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {(() => {
                      const totalViews = data.devices.reduce(
                        (sum, d) => sum + d.views,
                        0
                      );
                      let currentAngle = 0;

                      return data.devices.map((device, index) => {
                        const percentage =
                          totalViews > 0 ? device.views / totalViews : 0;
                        const angle = percentage * 360;

                        const getColor = () => {
                          switch (device.deviceType) {
                            case "desktop":
                              return "#3b82f6";
                            case "mobile":
                              return "#10b981";
                            case "tablet":
                              return "#8b5cf6";
                            default:
                              return "#6b7280";
                          }
                        };

                        const x1 =
                          50 +
                          40 * Math.cos(((currentAngle - 90) * Math.PI) / 180);
                        const y1 =
                          50 +
                          40 * Math.sin(((currentAngle - 90) * Math.PI) / 180);
                        const x2 =
                          50 +
                          40 *
                            Math.cos(
                              ((currentAngle + angle - 90) * Math.PI) / 180
                            );
                        const y2 =
                          50 +
                          40 *
                            Math.sin(
                              ((currentAngle + angle - 90) * Math.PI) / 180
                            );

                        const largeArc = angle > 180 ? 1 : 0;

                        const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

                        currentAngle += angle;

                        return (
                          <path
                            key={device.deviceType}
                            d={path}
                            fill={getColor()}
                            stroke="white"
                            strokeWidth="2"
                            className="transition-all duration-500"
                          />
                        );
                      });
                    })()}
                  </svg>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {data.devices
                          .reduce((sum, d) => sum + d.views, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Views
                      </p>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {data.devices.map((device) => {
                    const totalViews = data.devices.reduce(
                      (sum, d) => sum + d.views,
                      0
                    );
                    const percentage =
                      totalViews > 0 ? (device.views / totalViews) * 100 : 0;

                    const getColor = () => {
                      switch (device.deviceType) {
                        case "desktop":
                          return "bg-blue-500";
                        case "mobile":
                          return "bg-green-500";
                        case "tablet":
                          return "bg-purple-500";
                        default:
                          return "bg-gray-500";
                      }
                    };

                    const getLabel = () => {
                      switch (device.deviceType) {
                        case "desktop":
                          return "Desktop";
                        case "mobile":
                          return "Mobile";
                        case "tablet":
                          return "Tablet";
                        default:
                          return device.deviceType;
                      }
                    };

                    return (
                      <div
                        key={device.deviceType}
                        className="flex items-center gap-2"
                      >
                        <div className={`w-3 h-3 rounded-full ${getColor()}`} />
                        <span className="text-sm">{getLabel()}</span>
                        <span className="text-sm font-medium">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                <div
                  key={utm.source}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{utm.source}</span>
                  <span className="text-sm font-medium">
                    {utm.views.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
