"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PlaylistFieldsProps {
  metadata: Record<string, any>;
  onChange: (metadata: Record<string, any>) => void;
}

export function PlaylistFields({ metadata, onChange }: PlaylistFieldsProps) {
  const updateField = (field: string, value: any) => {
    onChange({
      ...metadata,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Playlist Details</Label>
        <p className="text-xs text-muted-foreground">
          Share your playlist and why others should check it out
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="playlistLink">
            Playlist Link/ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="playlistLink"
            value={metadata.playlistLink || ""}
            onChange={(e) => updateField("playlistLink", e.target.value)}
            placeholder="Enter playlist URL or ID"
            className="cursor-text"
          />
          <p className="text-xs text-muted-foreground">
            Paste the playlist link or ID from your profile
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whyRecommend">
            Why Recommend This Playlist? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="whyRecommend"
            value={metadata.whyRecommend || ""}
            onChange={(e) => updateField("whyRecommend", e.target.value)}
            placeholder="What makes this playlist special? What themes or moods does it capture?"
            rows={4}
            className="resize-none cursor-text"
          />
        </div>
      </div>
    </div>
  );
}

