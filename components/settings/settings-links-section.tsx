"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Copy, Loader2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type UserLinkItem = {
  id: string;
  label: string;
  url: string;
  order: number;
  isActive: boolean;
  icon?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  clicks?: number;
};

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
        setButtonColor(theme?.buttonColor ?? "");
        setBackgroundColor(theme?.backgroundColor ?? "");
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

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const reordered = [...links];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    const linkIds = reordered.map((l) => l.id);
    setLinks(reordered.map((l, i) => ({ ...l, order: i })));
    try {
      const res = await fetch("/api/user/links/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkIds }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
    } catch {
      toast.error("Failed to reorder");
      fetchLinks();
    }
  };

  const handleSavePage = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/link-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim() || null,
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
            <Button type="button" variant="outline" size="icon" onClick={copyPageUrl}>
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

      {/* Links list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Links</Label>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add link
          </Button>
        </div>
        <ul className="space-y-2">
          {links.length === 0 ? (
            <li className="text-sm text-muted-foreground py-4 border border-dashed rounded-lg text-center">
              No links yet. Add your first link above.
            </li>
          ) : (
            links
              .sort((a, b) => a.order - b.order)
              .map((link, index) => (
                <li
                  key={link.id}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                >
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => index > 0 && handleReorder(index, index - 1)}
                      aria-label="Move up"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => index < links.length - 1 && handleReorder(index, index + 1)}
                      aria-label="Move down"
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{link.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(link)}
                    className="shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteLink(link.id)}
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))
          )}
        </ul>
      </div>

      <Separator />

      {/* Bio & theme */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Bio (optional)</Label>
        <Input
          placeholder="Short bio for your link page"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="max-w-md"
        />
        <div className="space-y-2">
          <Label className="text-sm font-medium">Button style</Label>
          <Select value={buttonStyle} onValueChange={(v) => setButtonStyle(v as "rounded" | "pill" | "square")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rounded">Rounded</SelectItem>
              <SelectItem value="pill">Pill</SelectItem>
              <SelectItem value="square">Square</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Button color (hex)</Label>
            <Input
              placeholder="#006DCA"
              value={buttonColor}
              onChange={(e) => setButtonColor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Background color (hex)</Label>
            <Input
              placeholder="Leave blank for default"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSavePage} disabled={saving}>
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
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLink} disabled={saving}>
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
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLink} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
