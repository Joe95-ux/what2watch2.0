"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronRight,
  Heart,
  List,
  Plus,
  Bookmark,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareDropdown } from "@/components/ui/share-dropdown";
import { SimplePagination as Pagination } from "@/components/ui/pagination";
import CreateListModal from "@/components/lists/create-list-modal";
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
import { useLists, useDeleteList, type List } from "@/hooks/use-lists";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

const EDITORIAL_PAGE_SIZE = 30;
const SIDEBAR_LISTS_PAGE_SIZE = 30;

type PublicListsResponse = {
  lists: List[];
  total?: number;
  page?: number;
  limit?: number;
};

export default function EditorialPageClient() {
  const queryClient = useQueryClient();
  const { isSignedIn } = useUser();
  const { data: currentUser } = useCurrentUser();
  const deleteList = useDeleteList();
  const currentRole = (currentUser?.role || "").toUpperCase();
  const canDeleteEditorial =
    currentRole === "ADMIN" ||
    currentRole === "SUPER_ADMIN" ||
    currentRole === "EDITOR" ||
    currentUser?.isForumAdmin === true;

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sortBy, setSortBy] = useState<"updatedAt" | "name">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [sidebarPage, setSidebarPage] = useState(1);
  const [listPendingDelete, setListPendingDelete] = useState<List | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, sortBy, sortOrder]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["editorial-lists-catalog", page, debouncedQ, sortBy, sortOrder],
    queryFn: async (): Promise<PublicListsResponse> => {
      const params = new URLSearchParams({
        editorialOnly: "true",
        limit: String(EDITORIAL_PAGE_SIZE),
        page: String(page),
        sortBy,
        order: sortOrder,
      });
      if (debouncedQ) params.set("q", debouncedQ);
      const res = await fetch(`/api/lists/public?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load editorial lists");
      return res.json();
    },
    staleTime: 60_000,
  });

  const lists = data?.lists ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / EDITORIAL_PAGE_SIZE));

  const { data: myLists = [], isLoading: myListsLoading } = useLists();

  const sidebarTotalPages = Math.max(
    1,
    Math.ceil(myLists.length / SIDEBAR_LISTS_PAGE_SIZE),
  );
  const sidebarSlice = useMemo(() => {
    const start = (sidebarPage - 1) * SIDEBAR_LISTS_PAGE_SIZE;
    return myLists.slice(start, start + SIDEBAR_LISTS_PAGE_SIZE);
  }, [myLists, sidebarPage]);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/editorial` : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Dark header */}
      <header className="border-b border-border bg-zinc-950 text-zinc-50 dark:bg-black">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="flex gap-4 min-w-0">
              <Avatar className="h-14 w-14 shrink-0 border border-white/10">
                <AvatarImage src="/icon1.png" alt="What2watch.net Editors" />
                <AvatarFallback className="bg-zinc-800 text-zinc-200">W</AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-2">
                <p className="text-sm text-zinc-400">What2watch.net Editors</p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  What2watch.net Editors&apos; lists
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 max-w-xl">
                  Explore lists curated by what2watch.net editors
                </p>
              </div>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0">
              <ShareDropdown
                shareUrl={shareUrl}
                title="What2watch.net Editors' lists"
                description="Explore lists curated by what2watch.net editors on What2Watch"
                variant="ghost"
                size="icon"
                showLabel={false}
                triggerTitle="Share"
                className="rounded-full border border-white/15 text-zinc-50 hover:bg-white/10 self-end"
              />
              {isSignedIn ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[20px] border-white/20 bg-transparent text-zinc-50 hover:bg-white/10 cursor-pointer"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create a new list
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[20px] border-white/20 bg-transparent text-zinc-50 hover:bg-white/10 cursor-pointer"
                  asChild
                >
                  <Link href="/sign-in">Create a new list</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Main column */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "…" : `${total} list${total === 1 ? "" : "s"}`}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end w-full sm:w-auto sm:flex-1 sm:max-w-xl">
                <Input
                  placeholder="Search lists…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full sm:max-w-xs"
                />
                <div className="flex gap-2">
                  <Select
                    value={sortBy}
                    onValueChange={(v) => setSortBy(v as "updatedAt" | "name")}
                  >
                    <SelectTrigger className="w-[140px] cursor-pointer">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updatedAt" className="cursor-pointer">
                        Last updated
                      </SelectItem>
                      <SelectItem value="name" className="cursor-pointer">
                        Name
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={sortOrder}
                    onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
                  >
                    <SelectTrigger className="w-[120px] cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc" className="cursor-pointer">
                        Descending
                      </SelectItem>
                      <SelectItem value="asc" className="cursor-pointer">
                        Ascending
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-[5px] border border-border overflow-hidden">
              {isLoading || isFetching ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading editorial lists…
                </div>
              ) : lists.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No editorial lists match your search.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {lists.map((list) => (
                    <EditorialListRow
                      key={list.id}
                      list={list}
                      canDelete={Boolean(isSignedIn && canDeleteEditorial)}
                      onRequestDelete={(item) => setListPendingDelete(item)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-lg font-semibold">More to Explore</h2>

            <Link
              href="/dashboard/watchlist"
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <Bookmark className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm">Your watchlist</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Movies and TV you plan to watch
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-primary shrink-0" />
            </Link>

            <Link
              href="/dashboard/my-list"
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                  <Heart className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm">Favorite people</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Actors and creators you follow
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-primary shrink-0" />
            </Link>

            <div className="space-y-3">
              <Link
                href="/lists"
                className="inline-flex items-center gap-0.5 text-lg font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <span>Your lists</span>
                <ChevronRight className="h-4 w-4 text-primary" aria-hidden />
              </Link>

              {!isSignedIn ? (
                <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
                  Sign in to see your lists here.
                </p>
              ) : myListsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : myLists.length === 0 ? (
                <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
                  You don&apos;t have any lists yet.
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {sidebarSlice.map((list) => (
                      <SidebarListMiniCard key={list.id} list={list} />
                    ))}
                  </ul>
                  <Pagination
                    currentPage={sidebarPage}
                    totalPages={sidebarTotalPages}
                    onPageChange={setSidebarPage}
                  />
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {isSignedIn && (
        <CreateListModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      )}

      <AlertDialog
        open={listPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setListPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this editorial list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {listPendingDelete?.name ?? "this list"}
              </span>{" "}
              from What2Watch. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              disabled={deleteList.isPending}
              onClick={async () => {
                if (!listPendingDelete) return;
                try {
                  await deleteList.mutateAsync(listPendingDelete.id);
                  toast.success("Editorial list deleted");
                  setListPendingDelete(null);
                  await queryClient.invalidateQueries({ queryKey: ["overview-editorial-lists"] });
                } catch {
                  toast.error("Could not delete this list");
                }
              }}
            >
              {deleteList.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditorialListRow({
  list,
  canDelete,
  onRequestDelete,
}: {
  list: List;
  canDelete: boolean;
  onRequestDelete: (list: List) => void;
}) {
  const router = useRouter();
  const firstPoster = list.items?.find((i) => Boolean(i.posterPath))?.posterPath ?? null;
  const count = list._count?.items ?? list.items?.length ?? 0;
  const vis = list.visibility === "PUBLIC" ? "Public" : list.visibility === "FOLLOWERS_ONLY" ? "Followers only" : "Private";
  const updated = list.updatedAt
    ? format(new Date(list.updatedAt), "MMM d, yyyy")
    : "—";

  return (
    <li className="flex items-stretch gap-0">
      <button
        type="button"
        onClick={() => router.push(`/lists/${list.id}`)}
        className={cn(
          "flex-1 flex items-center gap-3 sm:gap-4 text-left py-3 px-3 sm:px-4 min-w-0",
          "hover:bg-muted/30 transition-colors cursor-pointer",
        )}
      >
        <div className="relative w-11 h-[4.75rem] sm:w-12 sm:h-[5.25rem] rounded-[5px] overflow-hidden bg-muted shrink-0">
          {firstPoster ? (
            <Image
              src={getPosterUrl(firstPoster, "w200")}
              alt=""
              fill
              className="object-cover"
              sizes="48px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <List className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="font-semibold text-sm line-clamp-1">{list.name}</div>
          <div className="text-xs text-muted-foreground">
            {count} {count === 1 ? "item" : "items"}
          </div>
          <div className="text-xs text-muted-foreground capitalize">{vis}</div>
          <div className="text-xs text-muted-foreground">Modified {updated}</div>
        </div>
      </button>
      {canDelete && (
        <div className="flex items-center pr-2 sm:pr-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
            title="Delete editorial list"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRequestDelete(list);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </li>
  );
}

function SidebarListMiniCard({ list }: { list: List }) {
  const router = useRouter();
  const firstPoster = list.items?.find((i) => Boolean(i.posterPath))?.posterPath ?? null;
  const count = list._count?.items ?? list.items?.length ?? 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => router.push(`/lists/${list.id}`)}
        className="w-full flex items-center gap-2 rounded-lg border border-border p-2 hover:bg-muted/40 transition-colors cursor-pointer text-left"
      >
        <div className="relative w-10 h-14 rounded-[5px] overflow-hidden bg-muted shrink-0">
          {firstPoster ? (
            <Image
              src={getPosterUrl(firstPoster, "w200")}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <List className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium line-clamp-1">{list.name}</div>
          <div className="text-[11px] text-muted-foreground">{count} items</div>
        </div>
      </button>
    </li>
  );
}
