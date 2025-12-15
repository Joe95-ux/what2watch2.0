"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flag, FileText, MessageSquare, AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { AppealDialog } from "./appeal-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MyReportsContent() {
  const queryClient = useQueryClient();
  const [appealingReport, setAppealingReport] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-forum-reports"],
    queryFn: async () => {
      const res = await fetch("/api/forum/reports/my-reports");
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const appealReport = useMutation({
    mutationFn: async ({
      reportId,
      appealReason,
      targetType,
    }: {
      reportId: string;
      appealReason: string;
      targetType: "post" | "reply";
    }) => {
      const res = await fetch(`/api/forum/reports/${reportId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appealReason, targetType }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit appeal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-forum-reports"] });
      toast.success("Appeal submitted successfully");
      setAppealingReport(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const postReports = data?.postReports || [];
  const replyReports = data?.replyReports || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "reviewed":
        return <Badge variant="secondary">Reviewed</Badge>;
      case "appealed":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
            <AlertCircle className="h-3 w-3 mr-1" />
            Appeal Submitted
          </Badge>
        );
      case "appeal_approved":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Appeal Approved
          </Badge>
        );
      case "appeal_rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Appeal Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const canAppeal = (report: any) => {
    return report.status === "reviewed" || report.status === "pending";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const allReports = [...postReports, ...replyReports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (allReports.length === 0) {
    return (
      <div className="text-center py-12">
        <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Reports</h3>
        <p className="text-sm text-muted-foreground">
          Your content hasn't been reported. Keep up the great work!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Reported Content</h2>
        <p className="text-sm text-muted-foreground">
          View reports on your content and appeal if you believe they are incorrect.
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" className="cursor-pointer">All ({allReports.length})</TabsTrigger>
          <TabsTrigger value="posts" className="cursor-pointer">Posts ({postReports.length})</TabsTrigger>
          <TabsTrigger value="replies" className="cursor-pointer">Replies ({replyReports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {allReports.map((report: any) => (
            <ReportCard
              key={report.id}
              report={report}
              getStatusBadge={getStatusBadge}
              canAppeal={canAppeal}
              onAppeal={() => setAppealingReport(report)}
            />
          ))}
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          {postReports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No post reports</p>
          ) : (
            postReports.map((report: any) => (
              <ReportCard
                key={report.id}
                report={report}
                getStatusBadge={getStatusBadge}
                canAppeal={canAppeal}
                onAppeal={() => setAppealingReport(report)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="replies" className="space-y-4">
          {replyReports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reply reports</p>
          ) : (
            replyReports.map((report: any) => (
              <ReportCard
                key={report.id}
                report={report}
                getStatusBadge={getStatusBadge}
                canAppeal={canAppeal}
                onAppeal={() => setAppealingReport(report)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Appeal Dialog */}
      {appealingReport && (
        <AppealDialog
          isOpen={!!appealingReport}
          onClose={() => setAppealingReport(null)}
          onSubmit={async (appealReason) => {
            await appealReport.mutateAsync({
              reportId: appealingReport.id,
              appealReason,
              targetType: appealingReport.type,
            });
          }}
          type={appealingReport.type}
          content={
            appealingReport.type === "post"
              ? appealingReport.target.content || appealingReport.target.title || ""
              : appealingReport.target.content || ""
          }
          reportReason={appealingReport.reason}
          isPending={appealReport.isPending}
        />
      )}
    </div>
  );
}

function ReportCard({
  report,
  getStatusBadge,
  canAppeal,
  onAppeal,
}: {
  report: any;
  getStatusBadge: (status: string) => React.ReactNode;
  canAppeal: (report: any) => boolean;
  onAppeal: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {report.type === "post" ? (
              <FileText className="h-5 w-5 text-muted-foreground" />
            ) : (
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-lg">
                {report.type === "post" ? "Post Report" : "Reply Report"}
              </CardTitle>
              <CardDescription>
                Reported {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge(report.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Your Content</h4>
          <div className="p-3 rounded-lg border bg-muted/50">
            {report.type === "post" ? (
              <div>
                <Link
                  href={`/forum/${report.target.slug || report.target.id}`}
                  className="font-medium hover:underline cursor-pointer"
                >
                  {report.target.title}
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                <Link
                  href={`/forum/${report.target.post.slug || report.target.post.id}`}
                  className="text-xs text-muted-foreground hover:underline cursor-pointer"
                >
                  Post: {report.target.post.title}
                </Link>
                <p className="text-sm line-clamp-3">{report.target.content}</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">Report Reason</h4>
          <div className="p-3 rounded-lg border bg-muted/50">
            <p className="text-sm font-medium">{report.reason}</p>
            {report.description && (
              <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
            )}
          </div>
        </div>
        {report.appealReason && (
          <div>
            <h4 className="text-sm font-medium mb-2">Your Appeal</h4>
            <div className="p-3 rounded-lg border bg-muted/50">
              <p className="text-sm">{report.appealReason}</p>
            </div>
          </div>
        )}
        {report.reviewNotes && (
          <div>
            <h4 className="text-sm font-medium mb-2">Admin Review Notes</h4>
            <div className="p-3 rounded-lg border bg-muted/50">
              <p className="text-sm">{report.reviewNotes}</p>
            </div>
          </div>
        )}
        {canAppeal(report) && (
          <Button onClick={onAppeal} variant="outline" className="cursor-pointer">
            <AlertCircle className="h-4 w-4 mr-2" />
            Appeal Report
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

