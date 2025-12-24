"use client";

import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageSquare, 
  Reply, 
  Eye, 
  ArrowUp, 
  ArrowDown, 
  Bookmark,
  TrendingUp,
  FileText,
  Archive,
  Clock,
  Lock,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ForumStats {
  postCount: number;
  replyCount: number;
  totalReactions: number;
  totalViews: number;
  totalUpvotes: number;
  totalDownvotes: number;
  totalScore: number;
  savedPostsCount: number;
  savedCommentsCount: number;
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  scheduledCount: number;
  totalRepliesReceived: number;
}

export function ForumSummaryContent() {
  const { data: currentUser } = useCurrentUser();

  const { data, isLoading } = useQuery<{ stats: ForumStats }>({
    queryKey: ["forum-my-stats"],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("User not found");
      }
      const response = await fetch(`/api/forum/stats/my-stats`);
      if (!response.ok) {
        throw new Error("Failed to fetch forum stats");
      }
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  const stats = data?.stats;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Posts",
      value: stats.postCount,
      icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
      helper: "All your forum posts",
    },
    {
      label: "Total Replies",
      value: stats.replyCount,
      icon: <Reply className="h-5 w-5 text-green-500" />,
      helper: "Replies you've made",
    },
    {
      label: "Total Views",
      value: stats.totalViews,
      icon: <Eye className="h-5 w-5 text-purple-500" />,
      helper: "Views on your posts",
    },
    {
      label: "Total Score",
      value: stats.totalScore,
      icon: <TrendingUp className="h-5 w-5 text-amber-500" />,
      helper: "Combined upvotes - downvotes",
    },
    {
      label: "Upvotes Received",
      value: stats.totalUpvotes,
      icon: <ArrowUp className="h-5 w-5 text-emerald-500" />,
      helper: "Upvotes on your posts",
    },
    {
      label: "Downvotes Received",
      value: stats.totalDownvotes,
      icon: <ArrowDown className="h-5 w-5 text-red-500" />,
      helper: "Downvotes on your posts",
    },
    {
      label: "Replies Received",
      value: stats.totalRepliesReceived,
      icon: <Reply className="h-5 w-5 text-indigo-500" />,
      helper: "Replies to your posts",
    },
    {
      label: "Published Posts",
      value: stats.publishedCount,
      icon: <Globe className="h-5 w-5 text-blue-500" />,
      helper: "Public posts",
    },
    {
      label: "Draft Posts",
      value: stats.draftCount,
      icon: <Lock className="h-5 w-5 text-amber-500" />,
      helper: "Private/draft posts",
    },
    {
      label: "Scheduled Posts",
      value: stats.scheduledCount,
      icon: <Clock className="h-5 w-5 text-orange-500" />,
      helper: "Posts scheduled for future",
    },
    {
      label: "Archived Posts",
      value: stats.archivedCount,
      icon: <Archive className="h-5 w-5 text-gray-500" />,
      helper: "Archived posts",
    },
    {
      label: "Saved Posts",
      value: stats.savedPostsCount,
      icon: <Bookmark className="h-5 w-5 text-pink-500" />,
      helper: "Posts you've bookmarked",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Forum Statistics</h2>
        <p className="text-sm text-muted-foreground">
          Overview of your forum activity and engagement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

