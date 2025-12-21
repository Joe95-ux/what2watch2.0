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
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!selectedAvatarUrl) {
      toast.error("No avatar selected", {
        description: "Please select an avatar first.",
      });
      return;
    }

    setIsSaving(true);

    try {
      // If it's a DiceBear URL or a blob URL, we need to download and upload to Cloudinary
      let avatarUrl = selectedAvatarUrl;

      if (selectedAvatarUrl.startsWith("https://api.dicebear.com") || selectedAvatarUrl.startsWith("blob:")) {
        // Download the avatar image
        const response = await fetch(selectedAvatarUrl);
        const blob = await response.blob();

        // Upload to Cloudinary
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
        avatarUrl = url;
      }

      // Sync to Clerk
      const syncResponse = await fetch("/api/user/sync-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatarUrl }),
      });

      if (!syncResponse.ok) {
        const error = await syncResponse.json();
        throw new Error(error.error || "Failed to sync avatar to Clerk");
      }

      // Invalidate user queries to refresh avatar
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      
      // Update Clerk user object
      if (user) {
        await user.reload();
      }

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
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

