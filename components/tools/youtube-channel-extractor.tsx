"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Youtube, Search, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { extractChannelIdFromUrl } from "@/lib/youtube-channels";

interface YouTubeChannel {
  id: string;
  title: string;
  thumbnail?: string;
  channelUrl: string;
}

export function YouTubeChannelExtractor() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const searchChannels = async (query: string) => {
    try {
      console.log("[YT CID Extractor] Searching for channels with query:", query);
      const response = await fetch(`/api/youtube/channels/search?q=${encodeURIComponent(query)}&maxResults=10`);
      console.log("[YT CID Extractor] Response status:", response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log("[YT CID Extractor] Received channels:", data.channels?.length || 0);
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
        } else {
          setError("No channels found. Try a different search term.");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("[YT CID Extractor] Search failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        // Provide more specific error messages
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleExtract();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start cursor-pointer">
          <Youtube className="mr-2 h-4 w-4" />
          <span>YT CID Extractor</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>YT CID Extractor</DialogTitle>
          <DialogDescription>
            Enter a YouTube channel name or URL to extract the channel ID. You can search by name or paste a channel URL.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
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
                className="cursor-pointer"
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
                    {channel.thumbnail ? (
                      <img
                        src={channel.thumbnail}
                        alt={channel.title}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Youtube className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{channel.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                          {channel.id}
                        </code>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(channel.id)}
                      className="cursor-pointer flex-shrink-0"
                    >
                      {copiedId === channel.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

