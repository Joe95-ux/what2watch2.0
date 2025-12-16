"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
    </div>
  );
}

