"use client";

import { Bell, TrendingUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendAlerts } from "@/hooks/use-trend-alerts";
import { useGeneralNotifications } from "@/hooks/use-general-notifications";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function TrendAlertsWidget() {
  const { data: alertsData, isLoading: alertsLoading } = useTrendAlerts(true); // Active only
  const { data: notificationsData, isLoading: notificationsLoading } = useGeneralNotifications(true); // Unread only

  const activeAlerts = alertsData?.alerts || [];
  const notifications = notificationsData?.notifications || [];
  
  // Filter for trend alert notifications
  const trendAlertNotifications = notifications.filter(
    (n) => n.type === "TREND_ALERT_TRIGGERED"
  ).slice(0, 5); // Show latest 5

  const recentTriggeredAlerts = activeAlerts
    .filter((alert) => alert.lastTriggered)
    .sort((a, b) => {
      const dateA = a.lastTriggered ? new Date(a.lastTriggered).getTime() : 0;
      const dateB = b.lastTriggered ? new Date(b.lastTriggered).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 3);

  if (alertsLoading || notificationsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeAlerts.length === 0 && trendAlertNotifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Trend Alerts
          </CardTitle>
          <CardDescription>Get notified when keywords start trending</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No active alerts. Create your first trend alert to get started.
          </p>
          <Link href="/youtube/alerts">
            <Button size="sm" className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white">
              Create Alert
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Trend Alerts
            </CardTitle>
            <CardDescription>
              {activeAlerts.length} active alert{activeAlerts.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Link href="/youtube/alerts">
            <Button variant="ghost" size="sm" className="cursor-pointer">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {trendAlertNotifications.length > 0 ? (
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-semibold">Recent Triggers</h4>
            {trendAlertNotifications.map((notification) => {
              const metadata = notification.metadata as any;
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 border-2 rounded-lg hover:border-primary/50 transition-all",
                    !notification.isRead && "bg-primary/5 border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {metadata?.momentum && (
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {metadata.momentum.toFixed(1)}% momentum
                          </Badge>
                        )}
                        {metadata?.searchVolume && (
                          <Badge variant="outline" className="text-xs">
                            {metadata.searchVolume.toLocaleString()} searches
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : recentTriggeredAlerts.length > 0 ? (
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-semibold">Recently Triggered</h4>
            {recentTriggeredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 border-2 rounded-lg hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1">{alert.keyword}</p>
                    <p className="text-xs text-muted-foreground">
                      Last triggered: {formatDistanceToNow(new Date(alert.lastTriggered!), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Triggered {alert.triggerCount} time{alert.triggerCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            {activeAlerts.length} active alert{activeAlerts.length !== 1 ? "s" : ""} monitoring
          </p>
          <Link href="/youtube/alerts">
            <Button variant="outline" size="sm" className="cursor-pointer">
              Manage Alerts
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
