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
  List as ListIcon,
  Plus,
  Bookmark,
  Loader2,
  Trash2,
  Search,
  X,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
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
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt" | "name">(
    "updatedAt",
  );
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
        sortBy:
          sortBy === "name"
            ? "name"
            : sortBy === "createdAt"
              ? "createdAt"
              : "updatedAt",
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

  const applySortPreset = (
    field: "updatedAt" | "createdAt" | "name",
    order: "asc" | "desc",
  ) => {
    setSortBy(field);
    setSortOrder(order);
  };

  const sortMenuActive = sortBy !== "updatedAt" || sortOrder !== "desc";

  return (
    <div className="min-h-screen bg-background">
      <header className="-mt-[65px] border-b border-white/10 bg-zinc-950 text-zinc-50 dark:bg-black pt-20 sm:pt-24 pb-8 lg:pb-10">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 lg:gap-8">
            <div className="flex gap-4 min-w-0">
              <Avatar className="h-14 w-14 shrink-0 border border-white/10">
                <AvatarImage src="/icon1.png" alt="What2watch.net Editors" />
                <AvatarFallback className="bg-zinc-800 text-zinc-200">W</AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-2">
                <p className="text-sm text-zinc-400">What2watch.net Editors</p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">
                  What2watch.net Editors&apos; lists
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 max-w-xl">
                  Explore lists curated by our Editors
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 shrink-0 lg:pt-1">
              <ShareDropdown
                shareUrl={shareUrl}
                title="What2watch.net Editors' lists"
                description="Explore lists curated by our Editors on What2Watch"
                variant="ghost"
                size="sm"
                showLabel
                triggerTitle="Share"
                className="h-9 rounded-[20px] border border-white/20 bg-transparent px-3 text-zinc-50 hover:bg-white/10 hover:text-zinc-50"
              />
              <span className="text-zinc-500 select-none" aria-hidden>
                |
              </span>
              {isSignedIn ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-[20px] border-white/20 bg-transparent text-zinc-50 hover:bg-white/10 hover:text-zinc-50 cursor-pointer"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2 shrink-0" />
                  Create a new list
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-[20px] border-white/20 bg-transparent text-zinc-50 hover:bg-white/10 hover:text-zinc-50 cursor-pointer"
                  asChild
                >
                  <Link href="/sign-in">Create a new list</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Main column */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground shrink-0">
                {isLoading ? "…" : `${total} list${total === 1 ? "" : "s"}`}
              </p>
              <div className="relative w-full sm:w-80 2xl:w-96 sm:max-w-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search lists…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0">
                  {searchInput.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer"
                      onClick={() => setSearchInput("")}
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 cursor-pointer",
                          sortMenuActive && "bg-primary/10 text-primary",
                        )}
                        aria-label="Sort lists"
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          sortBy === "updatedAt" &&
                            sortOrder === "desc" &&
                            "bg-accent",
                        )}
                        onClick={() => applySortPreset("updatedAt", "desc")}
                      >
                        Last modified (newest)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          sortBy === "updatedAt" &&
                            sortOrder === "asc" &&
                            "bg-accent",
                        )}
                        onClick={() => applySortPreset("updatedAt", "asc")}
                      >
                        Last modified (oldest)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          sortBy === "createdAt" &&
                            sortOrder === "desc" &&
                            "bg-accent",
                        )}
                        onClick={() => applySortPreset("createdAt", "desc")}
                      >
                        Date created (newest)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          sortBy === "createdAt" &&
                            sortOrder === "asc" &&
                            "bg-accent",
                        )}
                        onClick={() => applySortPreset("createdAt", "asc")}
                      >
                        Date created (oldest)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          sortBy === "name" && sortOrder === "asc" && "bg-accent",
                        )}
                        onClick={() => applySortPreset("name", "asc")}
                      >
                        Name (A–Z)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          sortBy === "name" && sortOrder === "desc" && "bg-accent",
                        )}
                        onClick={() => applySortPreset("name", "desc")}
                      >
                        Name (Z–A)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                <ul className="p-2 space-y-0">
                  {lists.map((list, index) => (
                    <li key={list.id}>
                      <EditorialListRow
                        list={list}
                        canDelete={Boolean(isSignedIn && canDeleteEditorial)}
                        onRequestDelete={(item) => setListPendingDelete(item)}
                      />
                      {index < lists.length - 1 && (
                        <Separator className="mx-2 my-0 w-auto bg-border" />
                      )}
                    </li>
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
              <div>
                {isSignedIn && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-fit rounded-[20px] border-0 bg-transparent hover:bg-muted/60 cursor-pointer"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create List
                  </Button>
                )}
              </div>

              <div>
                <Link
                  href="/lists"
                  className="inline-flex items-center gap-0.5 w-fit text-lg font-semibold cursor-pointer group"
                >
                  <span className="text-foreground">Your lists</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                </Link>
              </div>

              <div className="space-y-2">
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
                    {sidebarSlice.map((list) => (
                      <YourListsRelatedStyleCard key={list.id} list={list} />
                    ))}
                    <Pagination
                      currentPage={sidebarPage}
                      totalPages={sidebarTotalPages}
                      onPageChange={setSidebarPage}
                    />
                  </>
                )}
              </div>
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
    <div className="flex items-stretch gap-0 sm:min-h-32 sm:h-32">
      <button
        type="button"
        onClick={() => router.push(`/lists/${list.id}`)}
        className={cn(
          "flex-1 flex items-center gap-3 sm:gap-4 text-left py-3 px-2 sm:px-3 min-w-0",
          "cursor-pointer",
        )}
      >
        <div className="relative w-11 h-[4.75rem] sm:w-20 sm:h-full rounded-[5px] overflow-hidden bg-muted shrink-0">
          {firstPoster ? (
            <Image
              src={getPosterUrl(firstPoster, "w200")}
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 640px) 80px, 44px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ListIcon className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5 py-0.5">
          <div className="font-semibold text-sm sm:text-[15px] leading-snug line-clamp-2">
            {list.name}
          </div>
          <div className="text-xs sm:text-[13px] text-muted-foreground">
            {count} {count === 1 ? "item" : "items"}
          </div>
          <div className="text-xs sm:text-[13px] text-muted-foreground">
            <span className="capitalize">{vis}</span>
            <span className="text-muted-foreground/80"> · </span>
            <span>Modified {updated}</span>
          </div>
        </div>
      </button>
      {canDelete && (
        <div className="flex items-center pr-1 sm:pr-2">
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
    </div>
  );
}

/** Matches details page `CompactRelatedCard` for list rows (related user lists). */
function YourListsRelatedStyleCard({ list }: { list: List }) {
  const router = useRouter();
  const items = list.items ?? [];
  const firstWithPoster = items.find((x) => Boolean(x.posterPath));
  const posterPath = firstWithPoster?.posterPath ?? null;
  const itemCount = list._count?.items ?? items.length;
  const updatedAt = list.updatedAt
    ? new Date(list.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="relative flex rounded-lg border border-border transition-all group cursor-pointer overflow-hidden"
      onClick={() => router.push(`/lists/${list.id}`)}
    >
      <div className="flex-1 min-w-0 flex flex-col p-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/lists/${list.id}`);
          }}
          className="text-left text-sm font-semibold line-clamp-1 hover:text-primary transition-colors cursor-pointer"
        >
          {list.name}
        </button>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          List · {updatedAt ? `Updated ${updatedAt}` : "Recently updated"} . {itemCount}{" "}
          {itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      {posterPath ? (
        <div className="relative w-16 sm:w-20 aspect-[3/4] rounded-r-lg overflow-hidden flex-shrink-0 bg-muted">
          <Image
            src={getPosterUrl(posterPath, "w200")}
            alt={list.name}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-16 sm:w-20 aspect-[3/4] rounded-r-lg bg-muted flex-shrink-0 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">No Image</span>
        </div>
      )}
    </div>
  );
}
