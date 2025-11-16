"use client";

import { useState } from "react";
import { useActivityFeed, type ActivityType, type Activity } from "@/hooks/use-activity";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";
import { 
  Film, 
  Star, 
  FileText, 
  Heart, 
  List, 
  Music, 
  UserPlus,
  Calendar,
  Tv
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ACTIVITY_TYPES: { value: ActivityType | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Activity", icon: <Calendar className="h-4 w-4" /> },
  { value: "LOGGED_FILM", label: "Watched", icon: <Film className="h-4 w-4" /> },
  { value: "RATED_FILM", label: "Rated", icon: <Star className="h-4 w-4" /> },
  { value: "REVIEWED_FILM", label: "Reviewed", icon: <FileText className="h-4 w-4" /> },
  { value: "LIKED_FILM", label: "Liked", icon: <Heart className="h-4 w-4" /> },
  { value: "CREATED_LIST", label: "Lists", icon: <List className="h-4 w-4" /> },
  { value: "CREATED_PLAYLIST", label: "Playlists", icon: <Music className="h-4 w-4" /> },
  { value: "FOLLOWED_USER", label: "Followed", icon: <UserPlus className="h-4 w-4" /> },
];

function ActivityItem({ activity }: { activity: Activity }) {
  const displayName = activity.user.displayName || activity.user.username || "Unknown";
  const username = activity.user.username || "unknown";

  const getActivityMessage = () => {
    switch (activity.type) {
      case "LOGGED_FILM":
        return (
          <>
            <span className="font-semibold">{displayName}</span> watched{" "}
            <span className="font-semibold">{activity.title}</span>
          </>
        );
      case "RATED_FILM":
        return (
          <>
            <span className="font-semibold">{displayName}</span> rated{" "}
            <span className="font-semibold">{activity.title}</span>{" "}
            <span className="inline-flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < (activity.rating || 0)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              ))}
            </span>
          </>
        );
      case "REVIEWED_FILM":
        return (
          <>
            <span className="font-semibold">{displayName}</span> reviewed{" "}
            <span className="font-semibold">{activity.title}</span>
          </>
        );
      case "LIKED_FILM":
        return (
          <>
            <span className="font-semibold">{displayName}</span> liked{" "}
            <span className="font-semibold">{activity.title}</span>
          </>
        );
      case "CREATED_LIST":
        return (
          <>
            <span className="font-semibold">{displayName}</span> created list{" "}
            <span className="font-semibold">{activity.listName}</span>
          </>
        );
      case "CREATED_PLAYLIST":
        return (
          <>
            <span className="font-semibold">{displayName}</span> created playlist{" "}
            <span className="font-semibold">{activity.listName}</span>
          </>
        );
      case "FOLLOWED_USER":
        return (
          <>
            <span className="font-semibold">{displayName}</span> followed{" "}
            {activity.followedUser && (
              <span className="font-semibold">
                {activity.followedUser.displayName || activity.followedUser.username}
              </span>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const getActivityIcon = () => {
    switch (activity.type) {
      case "LOGGED_FILM":
        return <Film className="h-4 w-4" />;
      case "RATED_FILM":
        return <Star className="h-4 w-4" />;
      case "REVIEWED_FILM":
        return <FileText className="h-4 w-4" />;
      case "LIKED_FILM":
        return <Heart className="h-4 w-4" />;
      case "CREATED_LIST":
        return <List className="h-4 w-4" />;
      case "CREATED_PLAYLIST":
        return <Music className="h-4 w-4" />;
      case "FOLLOWED_USER":
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const hasPoster = activity.posterPath && (activity.type === "LOGGED_FILM" || activity.type === "RATED_FILM" || activity.type === "REVIEWED_FILM" || activity.type === "LIKED_FILM");

  return (
    <div className="flex gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      {/* Avatar */}
      <Link href={`/${username}`} className="flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={activity.user.avatarUrl || undefined} alt={activity.user.displayName || activity.user.username || "Unknown"} />
          <AvatarFallback>
            {displayName[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed">
              {getActivityMessage()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </p>
          </div>

          {/* Poster or Icon */}
          {hasPoster ? (
            <Link
              href={`/browse/${activity.mediaType}/${activity.tmdbId}`}
              className="flex-shrink-0"
            >
              <div className="relative h-16 w-12 rounded overflow-hidden border">
                <Image
                  src={getPosterUrl(activity.posterPath)}
                  alt={activity.title || ""}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </Link>
          ) : (
            <div className="flex-shrink-0 text-muted-foreground">
              {getActivityIcon()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivityContent() {
  const [selectedType, setSelectedType] = useState<ActivityType | "all">("all");
  const isMobile = useIsMobile();
  const { data: activities = [], isLoading } = useActivityFeed(
    selectedType === "all" ? undefined : selectedType,
    50
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="container max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Activity Feed</h1>
          <p className="text-muted-foreground mt-2">
            See what your friends are watching and rating
          </p>
        </div>

        {/* Filter */}
        {isMobile ? (
          <div className="mb-6">
            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as ActivityType | "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {ACTIVITY_TYPES.find((t) => t.value === selectedType)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      {type.icon}
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Tabs
            value={selectedType}
            onValueChange={(v) => setSelectedType(v as ActivityType | "all")}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-8">
              {ACTIVITY_TYPES.map((type) => (
                <TabsTrigger
                  key={type.value}
                  value={type.value}
                  className="flex items-center gap-2"
                >
                  {type.icon}
                  <span className="hidden sm:inline">{type.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Activity List */}
        <div className="bg-card border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border-b last:border-b-0">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-16 w-12 rounded" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                {selectedType === "all"
                  ? "No activity yet. Start following users to see their activity!"
                  : `No ${ACTIVITY_TYPES.find((t) => t.value === selectedType)?.label.toLowerCase()} activity yet.`}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

