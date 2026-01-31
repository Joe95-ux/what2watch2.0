"use client";

import { useState, useEffect, useCallback } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Pencil, Trash2, Copy, Loader2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
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

export function SettingsLinksSection({ username }: SettingsLinksSectionProps) {
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
  const [bio, setBio] = useState("");
  const [buttonStyle, setButtonStyle] = useState<"rounded" | "pill" | "square">("rounded");
  const [buttonColor, setButtonColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [themeId, setThemeId] = useState<string>("default");

  const fetchLinks = useCallback(async () => {
    try {
      const [linksRes, pageRes] = await Promise.all([
        fetch("/api/user/links"),
        fetch("/api/user/link-page"),
      ]);
      if (linksRes.ok) {
        const data = await linksRes.json();
        setLinks(data.links ?? []);
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
        body: JSON.stringify({ label: formLabel.trim(), url: formUrl.trim() }),
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
        body: JSON.stringify({ label: formLabel.trim(), url: formUrl.trim() }),
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

  const handleSavePage = async () => {
    setSaving(true);
    try {
      const sanitizedBio = sanitizeHtml(bio.trim());
      const bioToSave = trimToMaxWords(sanitizedBio, MAX_BIO_WORDS) || null;
      const res = await fetch("/api/user/link-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bioToSave,
          theme: {
            buttonStyle,
            buttonColor: buttonColor.trim() || undefined,
            backgroundColor: backgroundColor.trim() || undefined,
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
      toast.success("Link page updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(link)}
                              className="shrink-0 cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLink(link.id)}
                              className="shrink-0 cursor-pointer text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {/* Bio & theme */}
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
                      onChange={(color) => setBackgroundColor(color.hex)}
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
                      onChange={(color) => setButtonColor(color.hex)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>
        <Button onClick={handleSavePage} disabled={saving} className="cursor-pointer">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save page settings
        </Button>
      </div>

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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="cursor-pointer">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)} className="cursor-pointer">
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
