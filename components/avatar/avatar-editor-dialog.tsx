"use client";

import { useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";

interface AvatarEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
}

export function AvatarEditorDialog({
  isOpen,
  onClose,
  currentAvatarUrl,
}: AvatarEditorDialogProps) {
  const [image, setImage] = useState<File | string | null>(null);
  const [scale, setScale] = useState([1]);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [isUploading, setIsUploading] = useState(false);
  const editorRef = useRef<AvatarEditor>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const queryClient = useQueryClient();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type", {
          description: "Please select an image file.",
        });
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error("File too large", {
          description: "Image must be less than 5MB.",
        });
        return;
      }

      setImage(file);
    }
  };

  const handlePositionChange = (position: { x: number; y: number }) => {
    setPosition(position);
  };

  const handleSave = async () => {
    if (!editorRef.current || !image) {
      toast.error("No image selected", {
        description: "Please select an image first.",
      });
      return;
    }

    if (!user) {
      toast.error("Error", {
        description: "User not authenticated.",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get the canvas from the editor
      const canvas = editorRef.current.getImageScaledToCanvas();
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Error", {
            description: "Failed to process image.",
          });
          setIsUploading(false);
          return;
        }

        try {
          // Upload to Cloudinary and update database
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

          const file = new File([blob], "avatar.png", { type: "image/png" });
          await user.setProfileImage({ file });

          const syncResponse = await fetch("/api/user/sync-avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatarUrl: url }),
          });

          if (!syncResponse.ok) {
            const error = await syncResponse.json();
            throw new Error(error.error || "Failed to update database");
          }

          queryClient.setQueryData(["current-user", user.id], (old: any) => {
            if (!old) return old;
            return { ...old, avatarUrl: url };
          });
          queryClient.invalidateQueries({ queryKey: ["current-user", user.id] });

          toast.success("Avatar updated", {
            description: "Your profile picture has been updated successfully.",
          });

          // Reset and close
          setImage(null);
          setScale([1]);
          setPosition({ x: 0.5, y: 0.5 });
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          onClose();
        } catch (error) {
          console.error("Error uploading avatar:", error);
          toast.error("Error", {
            description: error instanceof Error ? error.message : "Failed to update avatar.",
          });
        } finally {
          setIsUploading(false);
        }
      }, "image/png", 0.95); // High quality PNG
    } catch (error) {
      console.error("Error processing avatar:", error);
      toast.error("Error", {
        description: "Failed to process image.",
      });
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setImage(null);
      setScale([1]);
      setPosition({ x: 0.5, y: 0.5 });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="lg:max-w-[800px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Edit Profile Picture</DialogTitle>
          <DialogDescription>
            Upload and crop your profile picture. You can adjust the zoom and position.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 min-h-0">
          <div className="space-y-4">
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
                  disabled={isUploading}
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
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!image || isUploading}
            className="cursor-pointer"
          >
            {isUploading ? "Uploading..." : "Save Avatar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

