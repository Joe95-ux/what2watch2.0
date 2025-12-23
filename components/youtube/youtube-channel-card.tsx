"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, ExternalLink, Youtube, RefreshCw, Copy, Check, Users } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getChannelProfilePath } from "@/lib/channel-path";
import { useCurrentUser } from "@/hooks/use-current-user";

interface YouTubeChannelCardProps {
  channel: {
    id: string;
    channelId: string;
    slug?: string | null;
    title: string | null;
    thumbnail: string | null;
    channelUrl: string | null;
    isActive: boolean;
    isPrivate: boolean;
    addedByUserId: string | null;
    canManage?: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
    subscriberCount?: string;
  };
}

function formatCount(count: string | number): string {
  const num = typeof count === "string" ? parseInt(count, 10) : count;
  if (isNaN(num)) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function YouTubeChannelCard({ channel }: YouTubeChannelCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [isUpdatingActive, setIsUpdatingActive] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const canManage = Boolean(channel.canManage);
  
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN" || currentUser?.isForumAdmin === true;
  
  // Fetch subscriber count if not provided and user is not admin
  const { data: channelStats } = useQuery({
    queryKey: ["channel-stats", channel.channelId],
    queryFn: async () => {
      const response = await fetch(`/api/youtube/channels/${channel.channelId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return {
        subscriberCount: data.channel?.subscriberCount || "0",
      };
    },
    enabled: !isAdmin && (!channel.subscriberCount || channel.subscriberCount === "0" || channel.subscriberCount === ""),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  const subscriberCount = (channel.subscriberCount && channel.subscriberCount !== "0" && channel.subscriberCount !== "") 
    ? channel.subscriberCount 
    : (channelStats?.subscriberCount || "0");

  const copyChannelId = async () => {
    try {
      await navigator.clipboard.writeText(channel.channelId);
      setCopiedId(true);
      toast.success("Channel ID copied to clipboard!");
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      toast.error("Failed to copy channel ID");
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    setIsUpdatingActive(true);
    try {
      const response = await fetch(`/api/youtube/channels/${channel.channelId}/active`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        toast.success(`Channel ${isActive ? "activated" : "deactivated"}`);
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels-manage"] });
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels-manage"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels"] });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to update channel status");
      }
    } catch (error) {
      console.error("Error updating channel active status:", error);
      toast.error("Failed to update channel status");
    } finally {
      setIsUpdatingActive(false);
    }
  };

  const handleTogglePrivacy = async (isPrivate: boolean) => {
    setIsUpdatingPrivacy(true);
    try {
      const response = await fetch(`/api/youtube/channels/${channel.channelId}/privacy`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPrivate }),
      });

      if (response.ok) {
        toast.success(`Channel marked as ${isPrivate ? "private" : "public"}`);
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels-manage"] });
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels-manage"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels"] });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to update channel privacy");
      }
    } catch (error) {
      console.error("Error updating channel privacy:", error);
      toast.error("Failed to update channel privacy");
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const handleRefresh = async (showToast = true) => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/youtube/channels/${channel.channelId}/refresh`, {
        method: "POST",
      });

      if (response.ok) {
        if (showToast) {
          toast.success("Channel details refreshed");
        }
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels-manage"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels-manage"] });
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (showToast) {
          toast.error(errorData.error || "Failed to refresh channel details");
        }
      }
    } catch (error) {
      console.error("Error refreshing channel details:", error);
      if (showToast) {
        toast.error("Failed to refresh channel details");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh missing channel details on mount
  useEffect(() => {
    if (!channel.title || !channel.thumbnail) {
      const refresh = async () => {
        setIsRefreshing(true);
        try {
          const response = await fetch(`/api/youtube/channels/${channel.channelId}/refresh`, {
            method: "POST",
          });

          if (response.ok) {
            await queryClient.invalidateQueries({ queryKey: ["youtube-channels-manage"] });
            await queryClient.refetchQueries({ queryKey: ["youtube-channels-manage"] });
          }
        } catch (error) {
          console.error("Error auto-refreshing channel details:", error);
        } finally {
          setIsRefreshing(false);
        }
      };
      refresh();
    }
  }, [channel.channelId, channel.title, channel.thumbnail, queryClient]);

  const channelTitle = channel.title || "Unknown Channel";
  const channelUrl = channel.channelUrl || `https://www.youtube.com/channel/${channel.channelId}`;
  const displayName = channelTitle.length > 30 ? channelTitle.slice(0, 30) + "..." : channelTitle;

  const profilePath = getChannelProfilePath(channel.channelId, channel.slug);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or switches
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a[href^='http']") ||
      target.closest('[role="switch"]') ||
      target.closest("label")
    ) {
      return;
    }
    router.push(profilePath);
  };

  return (
    <div
      className={`border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer ${
        !channel.isActive ? "opacity-60" : ""
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="relative group flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Link href={channelUrl} target="_blank" rel="noopener noreferrer" className="relative group">
          {channel.thumbnail ? (
            <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-border group-hover:ring-primary transition-all">
              <AvatarImage src={channel.thumbnail} alt={channelTitle} />
              <AvatarFallback>
                <Youtube className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-border group-hover:ring-primary transition-all">
              <AvatarFallback>
                <Youtube className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
          )}
          </Link>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <Link href={profilePath} className="block">
                <h3 className="font-semibold hover:underline truncate flex items-center gap-2">
                  {displayName}
                </h3>
              </Link>
              {isAdmin ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-muted-foreground truncate font-mono">
                    {channel.channelId}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyChannelId();
                    }}
                    className="h-6 w-6 p-0"
                    title="Copy channel ID"
                  >
                    {copiedId ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Users className="h-3 w-3" />
                  <span>{formatCount(subscriberCount)} subscribers</span>
                </div>
              )}
              <Link
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                YouTube
              </Link>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRefresh(true);
              }}
              disabled={isRefreshing}
              className="h-8 w-8 p-0 flex-shrink-0"
              title="Refresh channel details"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span className={`px-2 py-1 rounded ${channel.isActive ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-gray-500/20 text-gray-700 dark:text-gray-400"}`}>
          {channel.isActive ? "Active" : "Inactive"}
        </span>
        <span className={`px-2 py-1 rounded ${channel.isPrivate ? "bg-orange-500/20 text-orange-700 dark:text-orange-400" : "bg-blue-500/20 text-blue-700 dark:text-blue-400"}`}>
          {channel.isPrivate ? "Private" : "Public"}
        </span>
      </div>

      <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 flex-1">
          <Switch
            id={`active-${channel.id}`}
            checked={channel.isActive}
            onCheckedChange={handleToggleActive}
            disabled={isUpdatingActive || !canManage}
          />
          <Label htmlFor={`active-${channel.id}`} className="text-sm cursor-pointer flex items-center gap-1.5">
            {channel.isActive ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            {channel.isActive ? "Visible" : "Hidden"}
          </Label>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <Switch
            id={`privacy-${channel.id}`}
            checked={channel.isPrivate}
            onCheckedChange={handleTogglePrivacy}
            disabled={isUpdatingPrivacy || !canManage}
          />
          <Label htmlFor={`privacy-${channel.id}`} className="text-sm cursor-pointer flex items-center gap-1.5">
            <Lock className="h-4 w-4" />
            {channel.isPrivate ? "Private" : "Public"}
          </Label>
        </div>
      </div>
      {!canManage && (
        <p className="mt-3 text-sm text-muted-foreground">
          Only channels you added can be hidden or made private.
        </p>
      )}
    </div>
  );
}

