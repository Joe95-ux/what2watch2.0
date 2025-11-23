"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Youtube, Search, Loader2, AlertCircle, Plus, Lock } from "lucide-react";
import { toast } from "sonner";
import { extractChannelIdFromUrl } from "@/lib/youtube-channels";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface YouTubeChannel {
  id: string;
  title: string;
  thumbnail?: string;
  channelUrl: string;
}

interface YouTubeChannelExtractorInlineProps {
  onChannelAdded?: () => void;
}

export function YouTubeChannelExtractorInline({ onChannelAdded }: YouTubeChannelExtractorInlineProps = {}) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [privateChannels, setPrivateChannels] = useState<Set<string>>(new Set());
  const [existingChannels, setExistingChannels] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!input.trim()) {
      setError("Please enter a channel name or URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setChannels([]);

    try {
      // Check if input is a URL
      const isUrl = input.includes("youtube.com") || input.includes("youtu.be");
      
      if (isUrl) {
        // Extract channel ID from URL
        const channelId = extractChannelIdFromUrl(input);
        
        if (channelId) {
          // Fetch channel details by ID
          const response = await fetch(`/api/youtube/channels?channelIds=${encodeURIComponent(channelId)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.channels && data.channels.length > 0) {
              setChannels(data.channels);
              // Check if channel already exists
              await checkExistingChannels([channelId]);
            } else {
              setError("Channel not found. Please check the URL.");
            }
          } else {
            setError("Failed to fetch channel information.");
          }
        } else {
          // Try to search for the channel using the URL as a search term
          const searchTerm = input.split("/").pop() || input;
          await searchChannels(searchTerm);
        }
      } else {
        // Search for channel by name
        await searchChannels(input);
      }
    } catch (err) {
      console.error("Error extracting channel ID:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingChannels = async (channelIds: string[]) => {
    try {
      const response = await fetch("/api/youtube/channels/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelIds }),
      });
      if (response.ok) {
        const data = await response.json();
        const existingIds = new Set(data.existingIds || []);
        const existing = new Set<string>();
        channelIds.forEach((id) => {
          if (existingIds.has(id)) {
            existing.add(id);
          }
        });
        setExistingChannels(existing);
      }
    } catch (err) {
      console.error("[YT CID Extractor] Error checking existing channels:", err);
    }
  };

  const searchChannels = async (query: string) => {
    try {
      const response = await fetch(`/api/youtube/channels/search?q=${encodeURIComponent(query)}&maxResults=10`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          const channelIds = data.channels.map((ch: YouTubeChannel) => ch.id);
          await checkExistingChannels(channelIds);
        } else {
          setError("No channels found. Try a different search term.");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error) {
          if (errorData.error === "YouTube API key not configured") {
            setError("YouTube API key is not configured. Please contact the administrator.");
          } else if (errorData.debug?.status === 403) {
            setError("Access denied. The YouTube API key may be invalid or the API may not be enabled.");
          } else if (errorData.debug?.status === 400) {
            setError("Invalid search query. Please try a different search term.");
          } else {
            setError(`Failed to search: ${errorData.error}`);
          }
        } else {
          setError(`Failed to search for channels. (Status: ${response.status})`);
        }
      }
    } catch (err) {
      console.error("[YT CID Extractor] Error searching channels:", err);
      if (err instanceof Error) {
        setError(`Network error: ${err.message}`);
      } else {
        setError("An error occurred while searching. Please try again.");
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success("Channel ID copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addChannelId = async (channelId: string) => {
    try {
      const isPrivate = privateChannels.has(channelId);
      const response = await fetch("/api/youtube/channels/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelId, isPrivate }),
      });

      if (response.ok) {
        const data = await response.json();
        setAddedIds((prev) => new Set(prev).add(channelId));
        toast.success(`Channel added successfully!`);
        
        // Invalidate and refetch queries
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels"] });
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels-manage"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels-manage"] });
        
        // Clear input and channels
        setInput("");
        setChannels([]);
        setError(null);
        
        // Callback to refresh channel list
        if (onChannelAdded) {
          onChannelAdded();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400 && errorData.error?.includes("already exists")) {
          setExistingChannels((prev) => new Set(prev).add(channelId));
        }
        const errorMessage = errorData.error || errorData.message || "Failed to add channel ID";
        toast.error(errorMessage, {
          description: errorData.note || errorData.details,
          duration: 5000,
        });
      }
    } catch (err) {
      console.error("[YT CID Extractor] Error adding channel ID:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to add channel ID. Please try again.";
      toast.error(errorMessage);
    }
  };

  const updateChannelPrivacy = async (channelId: string, isPrivate: boolean) => {
    try {
      const response = await fetch(`/api/youtube/channels/${channelId}/privacy`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPrivate }),
      });

      if (response.ok) {
        const newPrivateChannels = new Set(privateChannels);
        if (isPrivate) {
          newPrivateChannels.add(channelId);
        } else {
          newPrivateChannels.delete(channelId);
        }
        setPrivateChannels(newPrivateChannels);
        setAddedIds((prev) => new Set(prev).add(channelId));
        toast.success(`Channel marked as ${isPrivate ? "private" : "public"}`);
        
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels"] });
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels-manage"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels-manage"] });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || "Failed to update channel privacy";
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error("[YT CID Extractor] Error updating channel privacy:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update channel privacy. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleExtract();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5" />
          Add YouTube Channel
        </CardTitle>
        <CardDescription>
          Search for a YouTube channel by name or paste a channel URL to extract the channel ID.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="channel-input">Channel Name or URL</Label>
          <div className="flex gap-2">
            <Input
              id="channel-input"
              placeholder="e.g., Nollywood Movies or https://www.youtube.com/channel/UC..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleExtract}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {channels.length > 0 && (
          <div className="space-y-3">
            <Label>Found Channels</Label>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <a
                    href={channel.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 flex-1 min-w-0 group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {channel.thumbnail ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={channel.thumbnail}
                          alt={channel.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Youtube className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-primary transition-colors">
                        {channel.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                          {channel.id}
                        </code>
                        {addedIds.has(channel.id) && (
                          <span className="text-xs text-green-600 font-medium">Added</span>
                        )}
                        {existingChannels.has(channel.id) && !addedIds.has(channel.id) && (
                          <span className="text-xs text-orange-600 font-medium">Already exists</span>
                        )}
                      </div>
                    </div>
                  </a>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(!existingChannels.has(channel.id) || addedIds.has(channel.id)) && (
                      <div className="flex items-center gap-1.5 px-2 py-1 border rounded-md">
                        <Checkbox
                          id={`private-${channel.id}`}
                          checked={privateChannels.has(channel.id)}
                          onCheckedChange={(checked) => {
                            const newPrivateChannels = new Set(privateChannels);
                            if (checked) {
                              newPrivateChannels.add(channel.id);
                            } else {
                              newPrivateChannels.delete(channel.id);
                            }
                            setPrivateChannels(newPrivateChannels);
                            
                            if (addedIds.has(channel.id) && existingChannels.has(channel.id)) {
                              updateChannelPrivacy(channel.id, Boolean(checked));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Label
                          htmlFor={`private-${channel.id}`}
                          className="text-xs cursor-pointer flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Lock className="h-3 w-3" />
                          Private
                        </Label>
                      </div>
                    )}
                    {existingChannels.has(channel.id) && !addedIds.has(channel.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const isPrivate = privateChannels.has(channel.id);
                          updateChannelPrivacy(channel.id, isPrivate);
                          setAddedIds((prev) => new Set(prev).add(channel.id));
                        }}
                        title="Mark as private"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    )}
                    {!existingChannels.has(channel.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          addChannelId(channel.id);
                        }}
                        disabled={addedIds.has(channel.id)}
                        title="Add to channel list"
                      >
                        {addedIds.has(channel.id) ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(channel.id);
                      }}
                    >
                      {copiedId === channel.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {channels.length === 0 && !isLoading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Youtube className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Enter a channel name or URL to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

