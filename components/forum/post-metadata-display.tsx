"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, Lightbulb, Music, List, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostMetadataDisplayProps {
  metadata: Record<string, any> | null | undefined;
  categorySlug?: string;
}

export function PostMetadataDisplay({ metadata, categorySlug }: PostMetadataDisplayProps) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  const slug = categorySlug?.toLowerCase() || "";

  // Bug Report Display
  if (slug === "bug-report" || slug === "help-support" || slug === "help-&-support") {
    return (
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="h-4 w-4 text-red-500" />
            Bug Report Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {metadata.severity && (
            <div>
              <span className="font-medium text-muted-foreground">Severity: </span>
              <Badge
                variant="outline"
                className={cn(
                  "ml-2",
                  metadata.severity === "critical" && "border-red-500 text-red-700 dark:text-red-400",
                  metadata.severity === "high" && "border-orange-500 text-orange-700 dark:text-orange-400",
                  metadata.severity === "medium" && "border-yellow-500 text-yellow-700 dark:text-yellow-400",
                  metadata.severity === "low" && "border-blue-500 text-blue-700 dark:text-blue-400"
                )}
              >
                {metadata.severity.charAt(0).toUpperCase() + metadata.severity.slice(1)}
              </Badge>
            </div>
          )}
          {metadata.stepsToReproduce && (
            <div>
              <span className="font-medium text-muted-foreground">Steps to Reproduce:</span>
              <div className="mt-1 whitespace-pre-wrap text-foreground">{metadata.stepsToReproduce}</div>
            </div>
          )}
          {metadata.expectedBehavior && (
            <div>
              <span className="font-medium text-muted-foreground">Expected Behavior:</span>
              <div className="mt-1 whitespace-pre-wrap text-foreground">{metadata.expectedBehavior}</div>
            </div>
          )}
          {metadata.actualBehavior && (
            <div>
              <span className="font-medium text-muted-foreground">Actual Behavior:</span>
              <div className="mt-1 whitespace-pre-wrap text-foreground">{metadata.actualBehavior}</div>
            </div>
          )}
          {metadata.browserInfo && (
            <div>
              <span className="font-medium text-muted-foreground">Browser/Device: </span>
              <span className="text-foreground">{metadata.browserInfo}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Feature Request Display
  if (slug === "feature-request" || slug === "feedback" || slug === "feature-requests") {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-blue-500" />
            Feature Request Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {metadata.priority && (
            <div>
              <span className="font-medium text-muted-foreground">Priority: </span>
              <Badge
                variant="outline"
                className={cn(
                  "ml-2",
                  metadata.priority === "critical" && "border-red-500 text-red-700 dark:text-red-400",
                  metadata.priority === "important" && "border-orange-500 text-orange-700 dark:text-orange-400",
                  metadata.priority === "nice-to-have" && "border-blue-500 text-blue-700 dark:text-blue-400"
                )}
              >
                {metadata.priority === "nice-to-have" ? "Nice to Have" : metadata.priority.charAt(0).toUpperCase() + metadata.priority.slice(1)}
              </Badge>
            </div>
          )}
          {metadata.useCase && (
            <div>
              <span className="font-medium text-muted-foreground">Use Case:</span>
              <div className="mt-1 whitespace-pre-wrap text-foreground">{metadata.useCase}</div>
            </div>
          )}
          {metadata.currentWorkaround && (
            <div>
              <span className="font-medium text-muted-foreground">Current Workaround:</span>
              <div className="mt-1 whitespace-pre-wrap text-foreground">{metadata.currentWorkaround}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Playlist Display
  if (slug === "playlists" || slug === "playlists-lists" || slug === "playlists-&-lists") {
    return (
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Music className="h-4 w-4 text-purple-500" />
            Playlist Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {metadata.playlistLink && (
            <div>
              <span className="font-medium text-muted-foreground">Playlist: </span>
              <a
                href={metadata.playlistLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View Playlist
              </a>
            </div>
          )}
          {metadata.whyRecommend && (
            <div>
              <span className="font-medium text-muted-foreground">Why Recommend:</span>
              <div className="mt-1 whitespace-pre-wrap text-foreground">{metadata.whyRecommend}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // List Display
  if (slug === "lists" || slug === "curated-lists") {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <List className="h-4 w-4 text-green-500" />
            List Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {metadata.listLink && (
            <div>
              <span className="font-medium text-muted-foreground">List: </span>
              <a
                href={metadata.listLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View List
              </a>
            </div>
          )}
          {metadata.listType && (
            <div>
              <span className="font-medium text-muted-foreground">Type: </span>
              <Badge variant="outline" className="ml-2">
                {metadata.listType.charAt(0).toUpperCase() + metadata.listType.slice(1)}
              </Badge>
            </div>
          )}
          {metadata.whyRecommend && (
            <div>
              <span className="font-medium text-muted-foreground">Why Recommend:</span>
              <div className="mt-1 whitespace-pre-wrap text-foreground">{metadata.whyRecommend}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Watchlist Display
  if (slug === "watchlists" || slug === "watchlist") {
    return (
      <Card className="border-l-4 border-l-cyan-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-cyan-500" />
            Watchlist Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {metadata.watchlistLink && (
            <div>
              <span className="font-medium text-muted-foreground">Watchlist: </span>
              <a
                href={metadata.watchlistLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View Watchlist
              </a>
            </div>
          )}
          {metadata.contentTypeFilter && (
            <div>
              <span className="font-medium text-muted-foreground">Content Type: </span>
              <Badge variant="outline" className="ml-2">
                {metadata.contentTypeFilter === "both" ? "Movies & TV" : metadata.contentTypeFilter.charAt(0).toUpperCase() + metadata.contentTypeFilter.slice(1)}
              </Badge>
            </div>
          )}
          {metadata.whyRecommend && (
            <div>
              <span className="font-medium text-muted-foreground">Why Recommend:</span>
              <div className="mt-1 whitespace-pre-wrap text-foreground">{metadata.whyRecommend}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fallback: display all metadata as key-value pairs
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Additional Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key}>
            <span className="font-medium text-muted-foreground">
              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}:{" "}
            </span>
            <span className="text-foreground">
              {typeof value === "string" ? value : JSON.stringify(value)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

