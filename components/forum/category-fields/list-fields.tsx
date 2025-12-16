"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ListFieldsProps {
  metadata: Record<string, any>;
  onChange: (metadata: Record<string, any>) => void;
}

export function ListFields({ metadata, onChange }: ListFieldsProps) {
  const updateField = (field: string, value: any) => {
    onChange({
      ...metadata,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">List Details</Label>
        <p className="text-xs text-muted-foreground">
          Share your curated list and why others should check it out
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="listLink">
            List Link/ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="listLink"
            value={metadata.listLink || ""}
            onChange={(e) => updateField("listLink", e.target.value)}
            placeholder="Enter list URL or ID"
            className="cursor-text"
          />
          <p className="text-xs text-muted-foreground">
            Paste the list link or ID from your profile
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="listType">List Type</Label>
          <Select
            value={metadata.listType || ""}
            onValueChange={(value) => updateField("listType", value)}
          >
            <SelectTrigger id="listType" className="cursor-pointer">
              <SelectValue placeholder="Select list type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ranked">Ranked</SelectItem>
              <SelectItem value="unranked">Unranked</SelectItem>
              <SelectItem value="themed">Themed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whyRecommend">
            Why Recommend This List? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="whyRecommend"
            value={metadata.whyRecommend || ""}
            onChange={(e) => updateField("whyRecommend", e.target.value)}
            placeholder="What makes this list special? What theme or criteria does it follow?"
            rows={4}
            className="resize-none cursor-text"
          />
        </div>
      </div>
    </div>
  );
}

