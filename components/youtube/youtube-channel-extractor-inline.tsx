"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Youtube, Search, Loader2, AlertCircle, Plus, UserPlus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { extractChannelIdFromUrl } from "@/lib/youtube-channels";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
  const [addToUserPoolChannels, setAddToUserPoolChannels] = useState<Set<string>>(new Set());
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
      const isUrl = input.includes("youtube.com") || input.includes("youtu.be");
      
      if (isUrl) {
        const channelId = extractChannelIdFromUrl(input);
        
        if (channelId) {
          const response = await fetch(`/api/youtube/channels?channelIds=${encodeURIComponent(channelId)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.channels && data.channels.length > 0) {
              setChannels(data.channels);
              await checkExistingChannels([channelId]);
            } else {
              setError("Channel not found. Please check the URL.");
            }
          } else {
            setError("Failed to fetch channel information.");
          }
        } else {
          const searchTerm = input.split("/").pop() || input;
          await searchChannels(searchTerm);
        }
      } else {
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
      const addToUserPool = addToUserPoolChannels.has(channelId);
      const response = await fetch("/api/youtube/channels/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelId, addToUserPool }),
      });

      if (response.ok) {
        const data = await response.json();
        setAddedIds((prev) => new Set(prev).add(channelId));
        toast.success(`Channel added successfully!`);
        
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels"] });
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels-manage"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels-manage"] });
        
        setInput("");
        setChannels([]);
        setError(null);
        
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

  const toggleUserPool = async (channelId: string, addToPool: boolean) => {
    try {
      const response = await fetch("/api/youtube/channels/pool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelId, action: addToPool ? "add" : "remove" }),
      });

      if (response.ok) {
        const newUserPoolChannels = new Set(addToUserPoolChannels);
        if (addToPool) {
          newUserPoolChannels.add(channelId);
        } else {
          newUserPoolChannels.delete(channelId);
        }
        setAddToUserPoolChannels(newUserPoolChannels);
        toast.success(addToPool ? "Channel added to your feed" : "Channel removed from your feed");
        
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels"] });
        await queryClient.invalidateQueries({ queryKey: ["youtube-channels-manage"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels"] });
        await queryClient.refetchQueries({ queryKey: ["youtube-channels-manage"] });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || "Failed to update channel pool";
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error("[YT CID Extractor] Error updating channel pool:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update channel pool. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleExtract();
    }
  };

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="pb-0 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Youtube className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Channel Extractor</CardTitle>
              <CardDescription className="text-sm mt-1">
                Search and add YouTube channels to your collection
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-0 space-y-6">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="channel-input" className="text-sm font-medium">
            Channel Name or URL
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="channel-input"
                placeholder="Search by name or paste channel URL..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="pl-10 h-11"
              />
            </div>
            <Button
              onClick={handleExtract}
              disabled={isLoading || !input.trim()}
              size="lg"
              className="px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results */}
        {channels.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Search Results</Label>
              <Badge variant="outline">{channels.length} found</Badge>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="group relative flex items-center gap-4 p-4 border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
                >
                  <a
                    href={channel.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 flex-1 min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {channel.thumbnail ? (
                      <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-border">
                        <Image
                          src={channel.thumbnail}
                          alt={channel.title}
                          fill
                          className="object-cover"
                          sizes="56px"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-border">
                        <Youtube className="h-7 w-7 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {channel.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded border">
                          {channel.id}
                        </code>
                        {addedIds.has(channel.id) && (
                          <Badge variant="default" className="text-xs">
                            Added
                          </Badge>
                        )}
                        {existingChannels.has(channel.id) && !addedIds.has(channel.id) && (
                          <Badge variant="secondary" className="text-xs">
                            Exists
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </a>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background">
                      <Checkbox
                        id={`user-pool-${channel.id}`}
                        checked={addToUserPoolChannels.has(channel.id)}
                        onCheckedChange={(checked) => {
                          const newUserPoolChannels = new Set(addToUserPoolChannels);
                          if (checked) {
                            newUserPoolChannels.add(channel.id);
                          } else {
                            newUserPoolChannels.delete(channel.id);
                          }
                          setAddToUserPoolChannels(newUserPoolChannels);
                          
                          // If channel already exists in app pool, update user pool immediately
                          if (existingChannels.has(channel.id)) {
                            toggleUserPool(channel.id, Boolean(checked));
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Label
                        htmlFor={`user-pool-${channel.id}`}
                        className="text-xs cursor-pointer flex items-center gap-1.5 font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <UserPlus className="h-3 w-3" />
                        Add to My Feed
                      </Label>
                    </div>
                    {!existingChannels.has(channel.id) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          addChannelId(channel.id);
                        }}
                        disabled={addedIds.has(channel.id)}
                        className="gap-2"
                      >
                        {addedIds.has(channel.id) ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(channel.id);
                      }}
                      className="gap-2"
                    >
                      {copiedId === channel.id ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {channels.length === 0 && !isLoading && !error && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
            <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-4">
              <Youtube className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Ready to search</p>
            <p className="text-xs text-muted-foreground">Enter a channel name or URL above to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
