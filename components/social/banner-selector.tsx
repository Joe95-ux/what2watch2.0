"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Upload, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import BannerGradientSelector, { BANNER_GRADIENTS } from "./banner-gradient-selector";
import Image from "next/image";

interface BannerSelectorProps {
  selectedGradient?: string;
  selectedBannerUrl?: string | null;
  onSelect: (data: { gradientId?: string; bannerUrl?: string | null }) => void;
}

export default function BannerSelector({
  selectedGradient,
  selectedBannerUrl,
  onSelect,
}: BannerSelectorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please select an image file.",
      });
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Image must be less than 10MB.",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/user/upload-banner", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || "Failed to upload banner");
      }

      const { url } = await uploadResponse.json();
      
      // Select the uploaded banner
      onSelect({ bannerUrl: url, gradientId: undefined });
      
      toast.success("Banner uploaded", {
        description: "Your banner has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading banner:", error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to upload banner.",
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveBanner = () => {
    setPreviewUrl(null);
    onSelect({ bannerUrl: null, gradientId: undefined });
  };

  const displayBannerUrl = previewUrl || selectedBannerUrl;

  return (
    <Tabs defaultValue="gradients" className="w-full">
      <TabsList className="w-full mb-4">
        <TabsTrigger value="gradients" className="flex-1">
          <Palette className="h-4 w-4 mr-2" />
          Gradients
        </TabsTrigger>
        <TabsTrigger value="upload" className="flex-1">
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </TabsTrigger>
      </TabsList>

      <TabsContent value="gradients" className="mt-0">
        <BannerGradientSelector
          selectedGradient={selectedGradient}
          onSelect={(gradientId) => {
            onSelect({ gradientId, bannerUrl: null });
          }}
        />
      </TabsContent>

      <TabsContent value="upload" className="mt-0 space-y-4">
        {/* Current/Preview Banner */}
        {displayBannerUrl && (
          <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-border">
            <Image
              src={displayBannerUrl}
              alt="Banner preview"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute top-2 right-2">
              <Button
                onClick={handleRemoveBanner}
                variant="destructive"
                size="sm"
                className="cursor-pointer"
              >
                Remove
              </Button>
            </div>
          </div>
        )}

        {/* Upload Input */}
        <div className="flex items-center justify-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="banner-upload"
            disabled={isUploading}
          />
          <label htmlFor="banner-upload">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={isUploading}
              asChild
            >
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : displayBannerUrl ? "Change Banner" : "Upload Banner"}
              </span>
            </Button>
          </label>
        </div>

        {!displayBannerUrl && (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Upload a custom banner image</p>
            <p className="text-xs mt-1">Recommended: 1920x400px or similar aspect ratio</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

