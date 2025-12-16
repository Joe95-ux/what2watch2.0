"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WatchlistFieldsProps {
  metadata: Record<string, any>;
  onChange: (metadata: Record<string, any>) => void;
}

export function WatchlistFields({ metadata, onChange }: WatchlistFieldsProps) {
  const updateField = (field: string, value: any) => {
    onChange({
      ...metadata,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Watchlist Details</Label>
        <p className="text-xs text-muted-foreground">
          Share your watchlist and why others should check it out
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="watchlistLink">
            Watchlist Link/ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="watchlistLink"
            value={metadata.watchlistLink || ""}
            onChange={(e) => updateField("watchlistLink", e.target.value)}
            placeholder="Enter watchlist URL or ID"
            className="cursor-text"
          />
          <p className="text-xs text-muted-foreground">
            Paste the watchlist link or ID from your profile
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contentTypeFilter">Content Type Filter</Label>
          <Select
            value={metadata.contentTypeFilter || ""}
            onValueChange={(value) => updateField("contentTypeFilter", value)}
          >
            <SelectTrigger id="contentTypeFilter" className="cursor-pointer">
              <SelectValue placeholder="Select content type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="movies">Movies Only</SelectItem>
              <SelectItem value="tv">TV Shows Only</SelectItem>
              <SelectItem value="both">Both Movies & TV</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whyRecommend">
            Why Recommend This Watchlist? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="whyRecommend"
            value={metadata.whyRecommend || ""}
            onChange={(e) => updateField("whyRecommend", e.target.value)}
            placeholder="What makes this watchlist special? What genres or themes does it focus on?"
            rows={4}
            className="resize-none cursor-text"
          />
        </div>
      </div>
    </div>
  );
}

