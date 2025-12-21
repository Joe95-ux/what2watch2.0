"use client";

import { useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadTabProps {
  onSelect: (url: string) => void;
  selectedUrl: string | null;
}

export function AvatarUploadTab({ onSelect, selectedUrl }: AvatarUploadTabProps) {
  const [image, setImage] = useState<File | string | null>(null);
  const [scale, setScale] = useState([1]);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const editorRef = useRef<AvatarEditor>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return;
      }

      setImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handlePositionChange = (position: { x: number; y: number }) => {
    setPosition(position);
  };

  const handleSelect = async () => {
    if (!editorRef.current || !image) {
      return;
    }

    try {
      // Get the canvas from the editor
      const canvas = editorRef.current.getImageScaledToCanvas();
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // Upload to Cloudinary first to get a permanent URL
        const formData = new FormData();
        formData.append("file", blob, "avatar.png");

        const uploadResponse = await fetch("/api/user/upload-avatar", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "Failed to upload avatar");
        }

        const { url } = await uploadResponse.json();
        setPreviewUrl(url);
        onSelect(url);
      }, "image/png", 0.95);
    } catch (error) {
      console.error("Error processing avatar:", error);
    }
  };

  const handleReset = () => {
    setImage(null);
    setScale([1]);
    setPosition({ x: 0.5, y: 0.5 });
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Image Upload Input */}
      <div className="flex items-center justify-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          id="avatar-upload"
        />
        <label htmlFor="avatar-upload">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            asChild
          >
            <span>
              <Upload className="mr-2 h-4 w-4" />
              {image ? "Change Image" : "Select Image"}
            </span>
          </Button>
        </label>
      </div>

      {/* Avatar Editor */}
      {image && (
        <div className="flex flex-col items-center space-y-4">
          <div className="relative border rounded-lg overflow-hidden bg-muted">
            <AvatarEditor
              ref={editorRef}
              image={image}
              width={300}
              height={300}
              border={50}
              borderRadius={150}
              scale={scale[0]}
              position={position}
              onPositionChange={handlePositionChange}
              color={[255, 255, 255, 0.6]}
              rotate={0}
            />
          </div>

          {/* Zoom Slider */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Zoom</span>
              <span className="font-medium">{Math.round(scale[0] * 100)}%</span>
            </div>
            <Slider
              value={scale}
              onValueChange={setScale}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Instructions */}
          <p className="text-xs text-muted-foreground text-center">
            Drag the image to reposition it. Use the zoom slider to adjust the size.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSelect}
              variant={selectedUrl === previewUrl ? "default" : "outline"}
              className="cursor-pointer"
            >
              {selectedUrl === previewUrl ? "Selected" : "Select This Avatar"}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="cursor-pointer"
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Placeholder when no image */}
      {!image && (
        <div className="flex items-center justify-center h-[300px] border rounded-lg bg-muted">
          <div className="text-center space-y-2">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Select an image to get started
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

