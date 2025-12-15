"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoryManagement() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-forum-categories", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/forum/categories?page=${page}&limit=20`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const categories = data?.categories || [];
  const pagination = data?.pagination;

  const createCategory = useMutation({
    mutationFn: async (data: {
      name: string;
      slug: string;
      description?: string;
      icon?: string;
      color?: string;
      order?: number;
    }) => {
      const res = await fetch("/api/forum/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forum-categories"] });
      queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
      toast.success("Category created successfully");
      setIsCreateOpen(false);
      setPage(1); // Reset to first page after creating
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        slug?: string;
        description?: string;
        icon?: string;
        color?: string;
        order?: number;
        isActive?: boolean;
      };
    }) => {
      const res = await fetch(`/api/admin/forum/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forum-categories"] });
      queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
      toast.success("Category updated successfully");
      setEditingCategory(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/forum/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forum-categories"] });
      queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categories</h2>
        <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category: any) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                  <TableCell>
                    {category.color && (
                      <Badge
                        className="h-4 w-4 rounded-full p-0 border"
                        style={{
                          backgroundColor: `${category.color}60`,
                          borderColor: category.color,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{category.postCount || 0}</TableCell>
                  <TableCell>{category.order || 0}</TableCell>
                  <TableCell>
                    {category.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCategory(category)}
                        className="cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this category?")) {
                            deleteCategory.mutate(category.id);
                          }
                        }}
                        className="cursor-pointer text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} categories
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="cursor-pointer"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CategoryDialog
        isOpen={isCreateOpen || !!editingCategory}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSubmit={(data) => {
          if (editingCategory) {
            updateCategory.mutate({ id: editingCategory.id, data });
          } else {
            createCategory.mutate(data);
          }
        }}
        isPending={createCategory.isPending || updateCategory.isPending}
      />
    </div>
  );
}

// Words that should be excluded from slugs (articles, prepositions, conjunctions)
const SLUG_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "nor", "for", "so", "yet",
  "at", "by", "in", "of", "on", "to", "up", "as", "is", "was",
  "are", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may",
  "might", "must", "can", "this", "that", "these", "those"
]);

// Generate slug from name
function generateSlug(name: string): string {
  if (!name) return "";
  
  return name
    .toLowerCase()
    .trim()
    // Split by spaces and filter out stop words
    .split(/\s+/)
    .filter(word => word.length > 0 && !SLUG_STOP_WORDS.has(word))
    // Join with hyphens and clean up
    .join("-")
    // Remove any remaining invalid characters, keep only alphanumeric, hyphens, and underscores
    .replace(/[^a-z0-9-_]/g, "-")
    // Replace multiple consecutive hyphens with a single hyphen
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
}

function CategoryDialog({
  isOpen,
  onClose,
  category,
  onSubmit,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  category?: any;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [order, setOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Update form when category changes
  useEffect(() => {
    if (category) {
      setName(category.name || "");
      setSlug(category.slug || "");
      setDescription(category.description || "");
      setIcon(category.icon || "");
      setColor(category.color || "");
      setOrder(category.order?.toString() || "0");
      setIsActive(category.isActive ?? true);
      setIsSlugManuallyEdited(true); // In edit mode, slug is already set
    } else {
      // Reset form for create mode
      setName("");
      setSlug("");
      setDescription("");
      setIcon("");
      setColor("");
      setOrder("0");
      setIsActive(true);
      setIsSlugManuallyEdited(false);
    }
  }, [category, isOpen]);

  // Auto-generate slug from name (only if slug hasn't been manually edited)
  useEffect(() => {
    if (!category && !isSlugManuallyEdited && name) {
      const generatedSlug = generateSlug(name);
      setSlug(generatedSlug);
    }
  }, [name, category, isSlugManuallyEdited]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      slug,
      description: description || undefined,
      icon: icon || undefined,
      color: color || undefined,
      order: parseInt(order) || 0,
      isActive: category ? isActive : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh] p-0 overflow-hidden">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{category ? "Edit Category" : "Create Category"}</DialogTitle>
          <DialogDescription>
            {category ? "Update category details" : "Create a new forum category"}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 px-6 py-4 scrollbar-thin overflow-y-auto">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="cursor-text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setIsSlugManuallyEdited(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-"));
                  }}
                  required
                  className="cursor-text"
                />
                {!category && !isSlugManuallyEdited && name && (
                  <p className="text-xs text-muted-foreground">
                    Slug will be auto-generated from name
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="cursor-text resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (emoji or icon name)</Label>
                <Input
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="cursor-text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color (hex)</Label>
                <Input
                  id="color"
                  type="color"
                  value={color || "#3B82F6"}
                  onChange={(e) => setColor(e.target.value)}
                  className="cursor-pointer h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="cursor-text"
                />
              </div>
              {category && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {category ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

