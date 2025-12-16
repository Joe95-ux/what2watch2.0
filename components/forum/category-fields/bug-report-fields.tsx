"use client";

import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface BugReportFieldsProps {
  metadata: Record<string, any>;
  onChange: (metadata: Record<string, any>) => void;
}

export function BugReportFields({ metadata, onChange }: BugReportFieldsProps) {
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = (field: string, value: any) => {
    onChange({
      ...metadata,
      [field]: value,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const currentImages = metadata.screenshots || [];

    for (const file of fileArray) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 2MB)`);
        continue;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      setUploadingImages((prev) => [...prev, tempId]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/forum/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to upload image");
        }

        const data = await response.json();
        const imageUrl = data.url;

        updateField("screenshots", [...currentImages, imageUrl]);
      } catch (error: any) {
        toast.error(error.message || `Failed to upload ${file.name}`);
      } finally {
        setUploadingImages((prev) => prev.filter((id) => id !== tempId));
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const currentImages = metadata.screenshots || [];
    updateField("screenshots", currentImages.filter((_: any, i: number) => i !== index));
  };

  const screenshots = metadata.screenshots || [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="severity">
          Severity <span className="text-destructive">*</span>
        </Label>
        <Select
          value={metadata.severity || ""}
          onValueChange={(value) => updateField("severity", value)}
        >
          <SelectTrigger id="severity" className="cursor-pointer">
            <SelectValue placeholder="Select severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="stepsToReproduce">
          Steps to Reproduce <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="stepsToReproduce"
          value={metadata.stepsToReproduce || ""}
          onChange={(e) => updateField("stepsToReproduce", e.target.value)}
          placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
          rows={4}
          className="resize-none cursor-text"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedBehavior">
          Expected Behavior <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="expectedBehavior"
          value={metadata.expectedBehavior || ""}
          onChange={(e) => updateField("expectedBehavior", e.target.value)}
          placeholder="What should happen?"
          rows={3}
          className="resize-none cursor-text"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="actualBehavior">
          Actual Behavior <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="actualBehavior"
          value={metadata.actualBehavior || ""}
          onChange={(e) => updateField("actualBehavior", e.target.value)}
          placeholder="What actually happens?"
          rows={3}
          className="resize-none cursor-text"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="browserInfo">Browser/Device Info</Label>
        <Input
          id="browserInfo"
          value={metadata.browserInfo || ""}
          onChange={(e) => updateField("browserInfo", e.target.value)}
          placeholder="e.g., Chrome 120 on Windows 11"
          className="cursor-text"
        />
      </div>

      <div className="space-y-2">
        <Label>Screenshots</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
          id="bug-screenshots"
        />
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer"
            disabled={uploadingImages.length > 0}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadingImages.length > 0 ? "Uploading..." : "Upload Screenshots"}
          </Button>
          {screenshots.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {screenshots.map((url: string, index: number) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Upload screenshots to help illustrate the bug (max 2MB per image)
        </p>
      </div>
    </div>
  );
}

