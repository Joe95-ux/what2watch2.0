"use client";

import { useState } from "react";
import { useAdminYouTubeToolsVisibility, useUpdateAdminYouTubeToolsVisibility, type YoutubeToolsVisibilityMode } from "@/hooks/use-admin-youtube-tools-visibility";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, EyeOff, Mail, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MODES: { value: YoutubeToolsVisibilityMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "HIDDEN_FROM_ALL", label: "Hidden from everyone", desc: "YouTube tools dropdown is hidden. Users see a single \"YouTube\" link that opens youtube.com.", icon: <EyeOff className="h-4 w-4" /> },
  { value: "AVAILABLE_TO_ALL", label: "Available to everyone", desc: "Everyone sees the full YouTube tools dropdown in the nav.", icon: <Eye className="h-4 w-4" /> },
  { value: "INVITE_ONLY", label: "Invite only (by email)", desc: "Only listed emails see the tools. Others see a single \"YouTube\" link to youtube.com.", icon: <Mail className="h-4 w-4" /> },
];

export function SettingsYoutubeVisibilitySection() {
  const { data, isLoading } = useAdminYouTubeToolsVisibility();
  const updateMutation = useUpdateAdminYouTubeToolsVisibility();
  const [newEmail, setNewEmail] = useState("");

  const handleSaveMode = async (newMode: YoutubeToolsVisibilityMode) => {
    try {
      await updateMutation.mutateAsync({ mode: newMode });
      toast.success("YouTube tools visibility updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const handleAddEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    const current = data?.allowedEmails ?? [];
    if (current.includes(trimmed)) {
      toast.error("Email already in list");
      return;
    }
    const next = [...current, trimmed];
    setNewEmail("");
    updateMutation.mutate(
      { allowedEmails: next },
      {
        onSuccess: () => toast.success("Email added"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
      }
    );
  };

  const handleRemoveEmail = (email: string) => {
    const current = data?.allowedEmails ?? [];
    const next = current.filter((e) => e !== email);
    updateMutation.mutate(
      { allowedEmails: next },
      {
        onSuccess: () => toast.success("Email removed"),
        onError: () => toast.error("Failed to update"),
      }
    );
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const currentMode = data.mode ?? "AVAILABLE_TO_ALL";
  const currentEmails = data.allowedEmails ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">
          YouTube tools visibility
        </h2>
        <p className="text-muted-foreground">
          Control who sees the YouTube tools dropdown in the main navigation. When hidden or invite-only, users see a simple &quot;YouTube&quot; link that opens youtube.com.
        </p>
      </div>
      <div className="space-y-4">
        <Label className="text-sm font-medium">Visibility</Label>
        <div className="grid grid-cols-1 gap-3">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => handleSaveMode(m.value)}
              disabled={updateMutation.isPending}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all cursor-pointer",
                "hover:border-primary/50 hover:bg-accent/50",
                currentMode === m.value ? "border-primary bg-accent" : "border-border"
              )}
            >
              <span className="text-muted-foreground mt-0.5">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{m.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {currentMode === "INVITE_ONLY" && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Allowed emails (invite list)</Label>
          <p className="text-sm text-muted-foreground">
            Only these emails will see the full YouTube tools dropdown. Add one email per line or use the field below.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEmail())}
              className="flex-1 cursor-pointer"
            />
            <Button type="button" onClick={handleAddEmail} disabled={!newEmail.trim() || updateMutation.isPending} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <ul className="space-y-2">
            {currentEmails.map((email) => (
              <li
                key={email}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
              >
                <span>{email}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  onClick={() => handleRemoveEmail(email)}
                  disabled={updateMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {currentEmails.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No emails added yet. Add emails to allow access.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
