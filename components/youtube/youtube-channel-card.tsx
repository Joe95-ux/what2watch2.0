"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, ExternalLink, Youtube, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface YouTubeChannelCardProps {
  channel: {
    id: string;
    channelId: string;
    title: string | null;
    thumbnail: string | null;
    channelUrl: string | null;
    isActive: boolean;
    isPrivate: boolean;
    addedByUserId: string | null;
    order: number;
    createdAt: string;
    updatedAt: string;
  };
}

export function YouTubeChannelCard({ channel }: YouTubeChannelCardProps) {
  const queryClient = useQueryClient();
  const [isUpdatingActive, setIsUpdatingActive] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/youtube/channels/${channel.channelId}/refresh`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Channel details refreshed");
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels-manage"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels-manage"] });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to refresh channel details");
      }
    } catch (error) {
      console.error("Error refreshing channel details:", error);
      toast.error("Failed to refresh channel details");
    } finally {
      setIsRefreshing(false);
    }
  };

  const channelTitle = channel.title || "Unknown Channel";
  const channelUrl = channel.channelUrl || `https://www.youtube.com/channel/${channel.channelId}`;
  const displayName = channelTitle.length > 30 ? channelTitle.slice(0, 30) + "..." : channelTitle;

  return (
    <div
      className={`border rounded-lg p-4 hover:border-primary/50 transition-colors ${
        !channel.isActive ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
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
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link href={channelUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
              <h3 className="font-semibold hover:underline truncate flex items-center gap-2">
                {displayName}
                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </h3>
              <p className="text-sm text-muted-foreground truncate font-mono mt-0.5">
                {channel.channelId}
              </p>
            </Link>
            {(!channel.title || !channel.thumbnail) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
                title="Refresh channel details"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className={`px-2 py-1 rounded ${channel.isActive ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-gray-500/20 text-gray-700 dark:text-gray-400"}`}>
          {channel.isActive ? "Active" : "Inactive"}
        </span>
        <span className={`px-2 py-1 rounded ${channel.isPrivate ? "bg-orange-500/20 text-orange-700 dark:text-orange-400" : "bg-blue-500/20 text-blue-700 dark:text-blue-400"}`}>
          {channel.isPrivate ? "Private" : "Public"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Switch
            id={`active-${channel.id}`}
            checked={channel.isActive}
            onCheckedChange={handleToggleActive}
            disabled={isUpdatingActive}
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
            disabled={isUpdatingPrivacy}
          />
          <Label htmlFor={`privacy-${channel.id}`} className="text-sm cursor-pointer flex items-center gap-1.5">
            <Lock className="h-4 w-4" />
            {channel.isPrivate ? "Private" : "Public"}
          </Label>
        </div>
      </div>
    </div>
  );
}

