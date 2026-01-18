"use client";

import { useState } from "react";
import { Play, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface JobStatus {
  id: string;
  name: string;
  endpoint: string;
  lastRun: Date | null;
  status: "idle" | "running" | "success" | "error";
  message?: string;
}

export function YouTubeJobsAdminClient() {
  const [jobs, setJobs] = useState<JobStatus[]>([
    {
      id: "snapshots",
      name: "Collect Video Snapshots",
      endpoint: "/api/youtube/snapshots/collect",
      lastRun: null,
      status: "idle",
    },
    {
      id: "trends",
      name: "Calculate Trends",
      endpoint: "/api/youtube/trends/calculate",
      lastRun: null,
      status: "idle",
    },
  ]);

  const triggerJob = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: "running" as const } : j
      )
    );

    try {
      // Note: Manual triggers from admin panel don't need CRON_SECRET
      // The endpoint will authenticate via user session
      const response = await fetch(job.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Job failed");
      }

      const successMessage = data.message || data.success 
        ? `${job.name} completed: ${data.message || JSON.stringify(data, null, 2)}`
        : `${job.name} completed successfully`;

      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: "success" as const,
                lastRun: new Date(),
                message: data.message || JSON.stringify(data, null, 2),
              }
            : j
        )
      );

      toast.success(successMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: "error" as const,
                message: errorMessage,
              }
            : j
        )
      );

      toast.error(`${job.name} failed: ${errorMessage}`);
    }
  };

  const getStatusIcon = (status: JobStatus["status"]) => {
    switch (status) {
      case "running":
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: JobStatus["status"]) => {
    switch (status) {
      case "running":
        return <Badge variant="default" className="bg-blue-500">Running</Badge>;
      case "success":
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Idle</Badge>;
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">YouTube Background Jobs</h1>
        <p className="text-muted-foreground">
          Manually trigger background jobs for video snapshot collection and trend calculation.
          For automated scheduling, use a free cron service (see docs/CRON_SETUP.md).
        </p>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <CardTitle className="text-lg">{job.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Endpoint: <code className="text-xs">{job.endpoint}</code>
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(job.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  {job.lastRun && (
                    <p className="text-sm text-muted-foreground">
                      Last run: {new Date(job.lastRun).toLocaleString()}
                    </p>
                  )}
                  {job.message && job.status === "error" && (
                    <p className="text-sm text-red-500">{job.message}</p>
                  )}
                  {job.message && job.status === "success" && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">
                      {job.message}
                    </pre>
                  )}
                </div>
                <Button
                  onClick={() => triggerJob(job.id)}
                  disabled={job.status === "running"}
                  className="gap-2 cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
                >
                  {job.status === "running" ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>For automated scheduling:</strong> Use a free cron service like cron-job.org
              to call these endpoints on a schedule.
            </p>
            <p>
              <strong>Required header:</strong> <code>Authorization: Bearer YOUR_CRON_SECRET</code>
            </p>
            <p>
              <strong>Schedule recommendations:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Snapshot Collection: Every 6 hours</li>
              <li>Trend Calculation: Daily at 1 AM</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
