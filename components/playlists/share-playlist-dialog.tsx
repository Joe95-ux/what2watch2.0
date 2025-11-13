"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Facebook, Twitter, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { Playlist } from "@/hooks/use-playlists";
import { useUpdatePlaylist } from "@/hooks/use-playlists";

interface SharePlaylistDialogProps {
  playlist: Playlist;
  isOpen: boolean;
  onClose: () => void;
}

export default function SharePlaylistDialog({ playlist, isOpen, onClose }: SharePlaylistDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const updatePlaylist = useUpdatePlaylist();
  
  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/playlists/${playlist.id}/public`
    : "";

  useEffect(() => {
    setIsPublic(playlist.isPublic);
  }, [playlist.isPublic]);

  const recordShareEvent = useCallback(async (source: string) => {
    try {
      const response = await fetch("/api/analytics/playlist-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: playlist.id,
          type: "SHARE",
          source,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to log share event:", errorData.error || response.statusText);
      }
    } catch (logError) {
      console.error("Failed to log share event", logError);
    }
  }, [playlist.id]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      // Record share event - await to ensure it completes
      await recordShareEvent("copy_link");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
      console.error(error);
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    setIsPublic(checked);
    try {
      await updatePlaylist.mutateAsync({
        playlistId: playlist.id,
        updates: { isPublic: checked },
      });
      toast.success(checked ? "Playlist is now public" : "Playlist is now private");
    } catch (error) {
      setIsPublic(!checked); // Revert on error
      toast.error("Failed to update playlist visibility");
      console.error(error);
    }
  };

  const handleSocialShare = async (platform: "facebook" | "twitter") => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(playlist.name);
    const encodedDescription = encodeURIComponent(playlist.description || "");

    let shareUrl_platform = "";
    if (platform === "facebook") {
      shareUrl_platform = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else if (platform === "twitter") {
      shareUrl_platform = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${encodedDescription ? ` - ${encodedDescription}` : ""}`;
    }

    if (shareUrl_platform) {
      // Record share event before opening - await to ensure it completes
      await recordShareEvent(platform);
      window.open(shareUrl_platform, "_blank", "width=600,height=400");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Playlist</DialogTitle>
          <DialogDescription>
            Share your playlist with others using the link below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="public-toggle" className="text-base font-medium">
                Make playlist public
              </Label>
              <p className="text-sm text-muted-foreground">
                {isPublic
                  ? "Anyone with the link can view this playlist"
                  : "Only you can view this playlist"}
              </p>
            </div>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={updatePlaylist.isPending}
            />
          </div>

          {isPublic && (
            <>
              {/* Share Link */}
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Social Share Buttons */}
              <div className="space-y-2">
                <Label>Share on</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSocialShare("facebook")}
                  >
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSocialShare("twitter")}
                  >
                    <Twitter className="h-4 w-4 mr-2" />
                    Twitter
                  </Button>
                </div>
              </div>
            </>
          )}

          {!isPublic && (
            <div className="p-4 rounded-lg border bg-muted/50 text-center">
              <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Make the playlist public to generate a shareable link
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

