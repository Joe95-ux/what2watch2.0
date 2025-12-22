"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useAvatar } from "@/contexts/avatar-context";
import { AvatarGeneratorTab } from "./avatar-generator-tab";
import { AvatarLibraryTab } from "./avatar-library-tab";
import { AvatarUploadTab } from "./avatar-upload-tab";

interface AvatarPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
}

export function AvatarPickerDialog({
  isOpen,
  onClose,
  currentAvatarUrl,
}: AvatarPickerDialogProps) {
  const [activeTab, setActiveTab] = useState("generated");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useUser();
  const { updateAvatar } = useAvatar();

  const handleSave = async () => {
    if (!selectedAvatarUrl) {
      toast.error("No avatar selected", {
        description: "Please select an avatar first.",
      });
      return;
    }

    if (!user) {
      toast.error("Error", {
        description: "User not authenticated.",
      });
      return;
    }

    setIsSaving(true);

    try {
      // If it's a DiceBear URL or a blob URL, we need to download and convert
      let avatarBlob: Blob | null = null;
      let avatarUrl = selectedAvatarUrl;

      if (selectedAvatarUrl.startsWith("https://api.dicebear.com") || selectedAvatarUrl.startsWith("blob:")) {
        // Download the avatar image
        const response = await fetch(selectedAvatarUrl);
        const blob = await response.blob();

        // Convert SVG to PNG if needed
        let finalBlob = blob;
        if (blob.type === "image/svg+xml" || selectedAvatarUrl.endsWith(".svg")) {
          // Convert SVG to PNG using canvas
          const img = new Image();
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            throw new Error("Failed to create canvas context");
          }

          // Set canvas size
          canvas.width = 400;
          canvas.height = 400;

          // Create object URL from blob
          const objectUrl = URL.createObjectURL(blob);
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              try {
                // Draw image to canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Convert canvas to blob (PNG)
                canvas.toBlob((pngBlob) => {
                  if (pngBlob) {
                    finalBlob = pngBlob;
                    URL.revokeObjectURL(objectUrl);
                    resolve();
                  } else {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error("Failed to convert SVG to PNG"));
                  }
                }, "image/png", 0.95);
              } catch (error) {
                URL.revokeObjectURL(objectUrl);
                reject(error);
              }
            };
            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error("Failed to load SVG image"));
            };
            img.src = objectUrl;
          });
        }

        avatarBlob = finalBlob;

        // Upload to Cloudinary and update database
        const formData = new FormData();
        formData.append("file", finalBlob, "avatar.png");

        const uploadResponse = await fetch("/api/user/upload-avatar", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "Failed to upload avatar");
        }

        const { url } = await uploadResponse.json();
        avatarUrl = url;
      } else {
        // If it's already a Cloudinary URL, we need to fetch it as a blob for Clerk
        const response = await fetch(selectedAvatarUrl);
        avatarBlob = await response.blob();
      }

      if (avatarBlob) {
        const file = new File([avatarBlob], "avatar.png", { type: avatarBlob.type || "image/png" });
        await user.setProfileImage({ file });
      }

      const syncResponse = await fetch("/api/user/sync-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });

      if (!syncResponse.ok) {
        const error = await syncResponse.json();
        throw new Error(error.error || "Failed to update database");
      }

      updateAvatar(avatarUrl);

      toast.success("Avatar updated", {
        description: "Your profile picture has been updated successfully.",
      });

      // Reset and close
      setSelectedAvatarUrl(null);
      onClose();
    } catch (error) {
      console.error("Error saving avatar:", error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to update avatar.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setSelectedAvatarUrl(null);
      setActiveTab("generated");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="lg:max-w-[800px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Choose Your Avatar</DialogTitle>
          <DialogDescription>
            Select from generated avatars, browse our library, or upload your own image.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="generated" className="flex-1">
                <Sparkles className="h-4 w-4 mr-2" />
                Generated
              </TabsTrigger>
              <TabsTrigger value="library" className="flex-1">
                <ImageIcon className="h-4 w-4 mr-2" />
                Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generated" className="mt-0">
              <AvatarGeneratorTab
                onSelect={(url) => setSelectedAvatarUrl(url)}
                selectedUrl={selectedAvatarUrl}
              />
            </TabsContent>

            <TabsContent value="library" className="mt-0">
              <AvatarLibraryTab
                onSelect={(url) => setSelectedAvatarUrl(url)}
                selectedUrl={selectedAvatarUrl}
              />
            </TabsContent>

            <TabsContent value="upload" className="mt-0">
              <AvatarUploadTab
                onSelect={(url) => setSelectedAvatarUrl(url)}
                selectedUrl={selectedAvatarUrl}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedAvatarUrl || isSaving}
            className="cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save Avatar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

