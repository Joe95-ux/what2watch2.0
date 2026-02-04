"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { Plus, Copy, Loader2, GripVertical, ChevronUp, ChevronDown, ImagePlus, X, ExternalLink } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import { PublicLinksPage, type PublicLink } from "@/components/links/public-links-page";
import { Checkbox } from "@/components/ui/checkbox";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { useUserLinksDragDrop, type UserLinkItem } from "@/hooks/use-user-links-drag-drop";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LINK_PAGE_THEMES,
  CUSTOM_THEME_ID,
  getThemeIdForColors,
} from "@/lib/link-page-themes";
import { sanitizeHtml } from "@/lib/moderation";
import { LinkRowActionsDropdown } from "@/components/settings/link-row-actions-dropdown";

const MAX_BIO_WORDS = 50;

function trimToMaxWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

const Compact = dynamic(
  () => import("@uiw/react-color").then((mod) => mod.Compact),
  { ssr: false }
);

type LinkPageTheme = {
  buttonStyle?: "rounded" | "pill" | "square";
  backgroundColor?: string;
  buttonColor?: string;
};

interface SettingsLinksSectionProps {
  username: string | null;
}

type SavedSnapshot = {
  bio: string;
  buttonStyle: "rounded" | "pill" | "square";
  buttonColor: string;
  backgroundColor: string;
  linkIds: string[];
};

export function SettingsLinksSection({ username }: SettingsLinksSectionProps) {
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  const [links, setLinks] = useState<UserLinkItem[]>([]);
  const [linkPage, setLinkPage] = useState<{ bio: string | null; theme: LinkPageTheme | null }>({
    bio: null,
    theme: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formBannerUrl, setFormBannerUrl] = useState<string | null>(null);
  const [formCustomDescription, setFormCustomDescription] = useState("");
  const [formSensitiveContent, setFormSensitiveContent] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bio, setBio] = useState("");
  const [buttonStyle, setButtonStyle] = useState<"rounded" | "pill" | "square">("rounded");
  const [buttonColor, setButtonColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [themeId, setThemeId] = useState<string>("default");
  const [openSaveBeforeDialog, setOpenSaveBeforeDialog] = useState(false);
  const lastSavedRef = useRef<SavedSnapshot | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      const [linksRes, pageRes] = await Promise.all([
        fetch("/api/user/links"),
        fetch("/api/user/link-page"),
      ]);
      let linkIds: string[] = [];
      if (linksRes.ok) {
        const data = await linksRes.json();
        const linkList = data.links ?? [];
        setLinks(linkList);
        linkIds = linkList.map((l: UserLinkItem) => l.id);
      }
      if (pageRes.ok) {
        const data = await pageRes.json();
        const theme = (data.linkPage?.theme as LinkPageTheme) ?? null;
        setLinkPage({
          bio: data.linkPage?.bio ?? null,
          theme,
        });
        setBio(data.linkPage?.bio ?? "");
        setButtonStyle(theme?.buttonStyle ?? "rounded");
        const bc = theme?.buttonColor ?? "";
        const bg = theme?.backgroundColor ?? "";
        setButtonColor(bc);
        setBackgroundColor(bg);
        setThemeId(getThemeIdForColors(bg, bc));
        lastSavedRef.current = {
          bio: data.linkPage?.bio ?? "",
          buttonStyle: theme?.buttonStyle ?? "rounded",
          buttonColor: bc,
          backgroundColor: bg,
          linkIds,
        };
      }
    } catch (e) {
      toast.error("Failed to load links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleAddLink = async () => {
    if (!formLabel.trim() || !formUrl.trim()) {
      toast.error("Label and URL are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formLabel.trim(),
          url: formUrl.trim(),
          bannerImageUrl: formBannerUrl || null,
          customDescription: formCustomDescription.trim() || null,
          isSensitiveContent: formSensitiveContent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add link");
      }
      const data = await res.json();
      setLinks((prev) => [...prev, data.link].sort((a, b) => a.order - b.order));
      setAddOpen(false);
      setFormLabel("");
      setFormUrl("");
      setFormBannerUrl(null);
      setFormCustomDescription("");
      setFormSensitiveContent(false);
      toast.success("Link added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add link");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLink = async () => {
    if (!editingId || !formLabel.trim() || !formUrl.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user/links/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formLabel.trim(),
          url: formUrl.trim(),
          bannerImageUrl: formBannerUrl || null,
          customDescription: formCustomDescription.trim() || null,
          isSensitiveContent: formSensitiveContent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update link");
      }
      const data = await res.json();
      setLinks((prev) =>
        prev.map((l) => (l.id === editingId ? { ...l, ...data.link } : l))
      );
      setEditingId(null);
      setFormLabel("");
      setFormUrl("");
      setFormBannerUrl(null);
      setFormCustomDescription("");
      setFormSensitiveContent(false);
      toast.success("Link updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update link");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      const res = await fetch(`/api/user/links/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setLinks((prev) => prev.filter((l) => l.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setFormLabel("");
        setFormUrl("");
      }
      toast.success("Link removed");
    } catch {
      toast.error("Failed to delete link");
    }
  };

  const { DragDropContext, handleDragEnd, reorderByIndex, displayedLinks } = useUserLinksDragDrop({
    links,
    onReorder: fetchLinks,
  });

  const handleSavePage = async (onSuccess?: () => void) => {
    setSaving(true);
    try {
      const sanitizedBio = sanitizeHtml(bio.trim());
      const bioToSave = trimToMaxWords(sanitizedBio, MAX_BIO_WORDS) || null;
      const bgValue = (backgroundColor ?? "").toString().trim();
      const btnValue = (buttonColor ?? "").toString().trim();
      const res = await fetch("/api/user/link-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bioToSave,
          theme: {
            buttonStyle,
            buttonColor: btnValue || null,
            backgroundColor: bgValue || null,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setLinkPage({
        bio: bio.trim() || null,
        theme: { buttonStyle, buttonColor: buttonColor || undefined, backgroundColor: backgroundColor || undefined },
      });
      lastSavedRef.current = {
        bio: bio.trim(),
        buttonStyle,
        buttonColor,
        backgroundColor,
        linkIds: displayedLinks.map((l) => l.id),
      };
      toast.success("Link page updated");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const currentSnapshot: SavedSnapshot = {
    bio,
    buttonStyle,
    buttonColor,
    backgroundColor,
    linkIds: displayedLinks.map((l) => l.id),
  };
  const lastSaved = lastSavedRef.current;
  const isDirty =
    lastSaved === null ||
    lastSaved.bio !== currentSnapshot.bio ||
    lastSaved.buttonStyle !== currentSnapshot.buttonStyle ||
    lastSaved.buttonColor !== currentSnapshot.buttonColor ||
    lastSaved.backgroundColor !== currentSnapshot.backgroundColor ||
    (lastSaved.linkIds.length !== currentSnapshot.linkIds.length ||
      lastSaved.linkIds.some((id, i) => id !== currentSnapshot.linkIds[i]));

  const linkPageUrl =
    typeof window !== "undefined" && username
      ? `${window.location.origin}/links/${username}`
      : "";

  const openLinkPageInNewTab = useCallback(() => {
    if (linkPageUrl) window.open(linkPageUrl, "_blank", "noopener,noreferrer");
  }, [linkPageUrl]);

  const handleViewFullPage = useCallback(() => {
    if (isDirty) {
      setOpenSaveBeforeDialog(true);
    } else {
      openLinkPageInNewTab();
    }
  }, [isDirty, openLinkPageInNewTab]);

  const handleSaveAndOpen = useCallback(() => {
    handleSavePage(() => {
      setOpenSaveBeforeDialog(false);
      openLinkPageInNewTab();
    });
  }, [openLinkPageInNewTab]);

  const previewLinks: PublicLink[] = displayedLinks.map((link) => ({
    id: link.id,
    label: link.label,
    url: link.url,
    icon: link.icon ?? undefined,
    resourceType: link.resourceType ?? undefined,
    resourceId: link.resourceId ?? undefined,
    isSensitiveContent: link.isSensitiveContent ?? undefined,
    ...(link.bannerImageUrl
      ? {
          customPreview: {
            coverImageUrl: link.bannerImageUrl,
            description: link.customDescription ?? null,
          },
        }
      : {}),
  }));

  const copyPageUrl = () => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const path = username ? `/links/${username}` : "/links/your-username";
    const url = `${base}${path}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy")
    );
  };

  const openEdit = (link: UserLinkItem) => {
    setEditingId(link.id);
    setFormLabel(link.label);
    setFormUrl(link.url);
    setFormBannerUrl(link.bannerImageUrl ?? null);
    setFormCustomDescription(link.customDescription ?? "");
    setFormSensitiveContent(link.isSensitiveContent ?? false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPEG, PNG, GIF, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB.");
      return;
    }
    setBannerUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/user/upload-link-banner", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      const { url } = await res.json();
      setFormBannerUrl(url);
      toast.success("Banner uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setBannerUploading(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pageUrl = username ? `/links/${username}` : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Link in bio</h2>
        <p className="text-muted-foreground">
          Add links to your profile page. Share one URL (e.g. in your Instagram bio) that shows all your links.
        </p>
      </div>
      <Separator />

      {/* Page URL */}
      {pageUrl && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Your link page</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}${pageUrl}`}
              className="bg-muted font-mono text-sm"
            />
            <Button type="button" variant="outline" size="icon" onClick={copyPageUrl} className="cursor-pointer">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this URL so people can see all your links in one place.
          </p>
        </div>
      )}
      {!username && (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          Set a username in Account to get your own link page (e.g. /links/yourname).
        </p>
      )}

      <Separator />

      {/* Links list (max 10) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Links {links.length >= 10 ? "(max 10)" : ""}</Label>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={links.length >= 10}
            className="cursor-pointer disabled:pointer-events-none"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add link
          </Button>
        </div>
        {links.length >= 10 && (
          <p className="text-xs text-muted-foreground">You have reached the maximum of 10 links. Remove one to add another.</p>
        )}
        {links.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 border border-dashed rounded-lg text-center">
            No links yet. Add your first link above.
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="user-links">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {displayedLinks.map((link, index) => (
                    <Draggable
                      key={link.id}
                      draggableId={link.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-lg border bg-card",
                            snapshot.isDragging && "opacity-70 shadow-md",
                            "cursor-grab active:cursor-grabbing"
                          )}
                        >
                          <div className="p-1 text-muted-foreground shrink-0" aria-hidden>
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{link.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                          </div>
                          <div
                              className="flex items-center gap-0 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer h-8 w-8"
                              onClick={() => reorderByIndex(index, index - 1)}
                              disabled={index === 0}
                              aria-label="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer h-8 w-8"
                              onClick={() => reorderByIndex(index, index + 1)}
                              disabled={index === displayedLinks.length - 1}
                              aria-label="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <LinkRowActionsDropdown
                              onEdit={() => openEdit(link)}
                              onDelete={() => handleDeleteLink(link.id)}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      <Separator />

      {/* Bio & theme + live preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Bio (optional)</Label>
            <Textarea
              placeholder="Short bio for your link page (max 50 words)"
              value={bio}
              onChange={(e) => {
                const sanitized = sanitizeHtml(e.target.value);
                const trimmed = trimToMaxWords(sanitized, MAX_BIO_WORDS);
                setBio(trimmed);
              }}
              className="max-w-md min-h-[80px] resize-y"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {bio.trim().split(/\s+/).filter(Boolean).length} / {MAX_BIO_WORDS} words
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Button style</Label>
            <Select value={buttonStyle} onValueChange={(v) => setButtonStyle(v as "rounded" | "pill" | "square")}>
              <SelectTrigger className="w-[180px] cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rounded">Rounded</SelectItem>
                <SelectItem value="pill">Pill</SelectItem>
                <SelectItem value="square">Square</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Color theme</Label>
            <p className="text-xs text-muted-foreground">
              Pick a preset for a matching look, or choose Custom to set your own colors.
            </p>
            <Select
              value={themeId}
              onValueChange={(value) => {
                setThemeId(value);
                if (value !== CUSTOM_THEME_ID) {
                  const preset = LINK_PAGE_THEMES.find((t) => t.id === value);
                  if (preset) {
                    setBackgroundColor(preset.backgroundColor);
                    setButtonColor(preset.buttonColor);
                  }
                }
              }}
            >
              <SelectTrigger className="w-full max-w-xs cursor-pointer">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                {LINK_PAGE_THEMES.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="cursor-pointer">
                    {t.name}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_THEME_ID} className="cursor-pointer">
                  Custom
                </SelectItem>
              </SelectContent>
            </Select>
            {themeId === CUSTOM_THEME_ID && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md pt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Page background</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-10 justify-start gap-2 cursor-pointer"
                        style={
                          backgroundColor
                            ? { backgroundColor, color: "#fff" }
                            : undefined
                        }
                      >
                        <span
                          className="h-5 w-5 rounded border border-border shrink-0"
                          style={{ backgroundColor: backgroundColor || "var(--muted)" }}
                        />
                        {backgroundColor || "Pick color"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0" align="start">
                      <Compact
                        color={backgroundColor || "#ffffff"}
                        onChange={(color) => {
                          const hex = typeof color?.hex === "string" ? color.hex : undefined;
                          if (hex !== undefined) setBackgroundColor(hex);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Link button color</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-10 justify-start gap-2 cursor-pointer"
                        style={
                          buttonColor
                            ? { backgroundColor: buttonColor, color: "#fff" }
                            : undefined
                        }
                      >
                        <span
                          className="h-5 w-5 rounded border border-border shrink-0"
                          style={{ backgroundColor: buttonColor || "var(--muted)" }}
                        />
                        {buttonColor || "Pick color"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0" align="start">
                      <Compact
                        color={buttonColor || "#006DCA"}
                        onChange={(color) => {
                          const hex = typeof color?.hex === "string" ? color.hex : undefined;
                          if (hex !== undefined) setButtonColor(hex);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
          <Button onClick={() => handleSavePage()} disabled={saving} className="cursor-pointer">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save page settings
          </Button>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Preview</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 cursor-pointer"
                onClick={handleViewFullPage}
                aria-label="View full page in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-md border bg-background overflow-hidden">
              <div className="scrollbar-thin max-h-[min(70vh,28rem)] overflow-y-auto">
                <PublicLinksPage
                displayName={currentUser?.displayName ?? null}
                username={username}
                avatarUrl={contextAvatarUrl ?? null}
                bio={bio.trim() || null}
                theme={{
                  buttonStyle,
                  buttonColor: buttonColor.trim() || undefined,
                  backgroundColor: backgroundColor.trim() || undefined,
                }}
                links={previewLinks}
                isOwner={false}
              />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={openSaveBeforeDialog} onOpenChange={setOpenSaveBeforeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Save and open your link page, or open without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setOpenSaveBeforeDialog(false);
                openLinkPageInNewTab();
              }}
            >
              Open without saving
            </Button>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                handleSaveAndOpen();
              }}
            >
              Save and open
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add link dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-label">Label</Label>
              <Input
                id="link-label"
                placeholder="e.g. My Instagram"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Banner image (optional)</Label>
              <p className="text-xs text-muted-foreground">Add a banner to show this link as a card like playlists.</p>
              {formBannerUrl ? (
                <div className="relative rounded-lg border overflow-hidden bg-muted w-full aspect-[560/200] max-h-24">
                  <Image src={formBannerUrl} alt="" fill className="object-cover" sizes="280px" unoptimized={formBannerUrl.includes("cloudinary")} />
                  <Button type="button" variant="secondary" size="icon" className="absolute top-1 right-1 h-7 w-7 rounded-full cursor-pointer" onClick={() => setFormBannerUrl(null)} aria-label="Remove banner">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-20 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="file" accept="image/*" className="sr-only" onChange={handleBannerUpload} disabled={bannerUploading} />
                  {bannerUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{bannerUploading ? "Uploading…" : "Upload banner"}</span>
                </label>
              )}
            </div>
            {formBannerUrl ? (
              <div className="space-y-2">
                <Label htmlFor="link-desc">Short description (optional)</Label>
                <Input
                  id="link-desc"
                  placeholder="One line shown under the link"
                  value={formCustomDescription}
                  onChange={(e) => setFormCustomDescription(e.target.value)}
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground">Truncated to one line on your link page.</p>
              </div>
            ) : null}
            <div className="flex items-center space-x-2">
              <Checkbox id="link-sensitive" checked={formSensitiveContent} onCheckedChange={(c) => setFormSensitiveContent(c === true)} className="cursor-pointer" />
              <Label htmlFor="link-sensitive" className="text-sm font-normal cursor-pointer">
                This link contains sexually explicit or sensitive content (visitors will see a consent screen before opening)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setFormBannerUrl(null); setFormCustomDescription(""); setFormSensitiveContent(false); }} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleAddLink} disabled={saving} className="cursor-pointer">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit link dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                placeholder="e.g. My Instagram"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                type="url"
                placeholder="https://..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Banner image (optional)</Label>
              <p className="text-xs text-muted-foreground">Add a banner to show this link as a card.</p>
              {formBannerUrl ? (
                <div className="relative rounded-lg border overflow-hidden bg-muted w-full aspect-[560/200] max-h-24">
                  <Image src={formBannerUrl} alt="" fill className="object-cover" sizes="280px" unoptimized={formBannerUrl.includes("cloudinary")} />
                  <Button type="button" variant="secondary" size="icon" className="absolute top-1 right-1 h-7 w-7 rounded-full cursor-pointer" onClick={() => setFormBannerUrl(null)} aria-label="Remove banner">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-20 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="file" accept="image/*" className="sr-only" onChange={handleBannerUpload} disabled={bannerUploading} />
                  {bannerUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{bannerUploading ? "Uploading…" : "Upload banner"}</span>
                </label>
              )}
            </div>
            {formBannerUrl ? (
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Short description (optional)</Label>
                <Input
                  id="edit-desc"
                  placeholder="One line shown under the link"
                  value={formCustomDescription}
                  onChange={(e) => setFormCustomDescription(e.target.value)}
                  maxLength={120}
                />
              </div>
            ) : null}
            <div className="flex items-center space-x-2">
              <Checkbox id="edit-sensitive" checked={formSensitiveContent} onCheckedChange={(c) => setFormSensitiveContent(c === true)} className="cursor-pointer" />
              <Label htmlFor="edit-sensitive" className="text-sm font-normal cursor-pointer">
                This link contains sexually explicit or sensitive content (visitors will see a consent screen before opening)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingId(null); setFormBannerUrl(null); setFormCustomDescription(""); setFormSensitiveContent(false); }} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleUpdateLink} disabled={saving} className="cursor-pointer">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
