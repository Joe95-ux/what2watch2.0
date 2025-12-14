"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, MessageSquare, Search, X } from "lucide-react";
import { ForumPostList } from "./forum-post-list";
import { CreatePostDialog } from "./create-post-dialog";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export function ForumPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const tag = searchParams.get("tag");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const order = searchParams.get("order") || "desc";
  const tmdbId = searchParams.get("tmdbId");
  const mediaType = searchParams.get("mediaType");

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => {
      const response = await fetch("/api/forum/categories");
      if (!response.ok) {
        return { categories: [] };
      }
      return response.json();
    },
  });

  // Sync search input with URL param
  useEffect(() => {
    setSearchInput(search || "");
  }, [search]);

  const updateSearchParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/forum?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParam("search", searchInput.trim() || null);
  };

  const clearSearch = () => {
    setSearchInput("");
    updateSearchParam("search", null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <MessageSquare className="h-8 w-8" />
              Forums
            </h1>
            <p className="text-muted-foreground mt-2">
              Discuss movies, TV shows, and more with the community
            </p>
          </div>
          {isSignedIn && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search posts..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          {/* Category Filter and Sort */}
          <div className="flex items-center gap-4 flex-wrap">
            <Select
              value={category || "all"}
              onValueChange={(value) => updateSearchParam("category", value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesData?.categories?.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) => updateSearchParam("sortBy", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Newest</SelectItem>
                <SelectItem value="views">Most Viewed</SelectItem>
                <SelectItem value="likes">Most Liked</SelectItem>
                <SelectItem value="replies">Most Replies</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSearchParam("order", order === "desc" ? "asc" : "desc")}
            >
              {order === "desc" ? "↓" : "↑"} {order === "desc" ? "Descending" : "Ascending"}
            </Button>
          </div>

          {/* Active Filters */}
          {(tag || category || search || tmdbId) && (
            <div className="flex items-center gap-2 flex-wrap">
              {search && (
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2">
                  Search: {search}
                  <button
                    onClick={clearSearch}
                    className="hover:underline"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {category && (
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2">
                  Category: {categoriesData?.categories?.find((c: any) => c.slug === category)?.name || category}
                  <button
                    onClick={() => updateSearchParam("category", null)}
                    className="hover:underline"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {tag && (
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2">
                  Tag: {tag}
                  <button
                    onClick={() => updateSearchParam("tag", null)}
                    className="hover:underline"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {tmdbId && mediaType && (
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2">
                  {mediaType === "movie" ? "Movie" : "TV Show"} Discussion
                  <button
                    onClick={() => {
                      updateSearchParam("tmdbId", null);
                      updateSearchParam("mediaType", null);
                    }}
                    className="hover:underline"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post List */}
        <ForumPostList />

        {/* Create Post Dialog */}
        {isSignedIn && (
          <CreatePostDialog
            isOpen={isCreateDialogOpen}
            onClose={() => setIsCreateDialogOpen(false)}
            tmdbId={tmdbId ? parseInt(tmdbId, 10) : undefined}
            mediaType={mediaType as "movie" | "tv" | undefined}
          />
        )}
      </div>
    </div>
  );
}

