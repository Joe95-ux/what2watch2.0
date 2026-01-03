"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Youtube, ChevronLeft, ChevronRight, Search, Filter, X, ArrowUpDown, ArrowDown, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeChannelExtractorInline } from "@/components/youtube/youtube-channel-extractor-inline";
import { YouTubeChannelCard } from "@/components/youtube/youtube-channel-card";
import { YouTubeChannelCardSkeleton } from "@/components/youtube/youtube-channel-card-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Channel {
  id: string;
  channelId: string;
  slug?: string | null;
  title: string | null;
  thumbnail: string | null;
  channelUrl: string | null;
  isActive: boolean;
  isPrivate: boolean;
  addedByUserId: string | null;
  canManage?: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface ChannelsResponse {
  channels: Channel[];
  total: number;
}

const fetchChannels = async (): Promise<ChannelsResponse> => {
  const response = await fetch("/api/youtube/channels/manage");
  if (!response.ok) {
    throw new Error("Failed to fetch channels");
  }
  return response.json();
};

const ITEMS_PER_PAGE = 12;

export default function YouTubeManagementContent() {
  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [privacyFilter, setPrivacyFilter] = useState<"all" | "public" | "private">("all");
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<"title" | "createdAt" | "updatedAt">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data, isLoading, isError, refetch } = useQuery<ChannelsResponse>({
    queryKey: ["youtube-channels-manage"],
    queryFn: fetchChannels,
  });

  const channels = useMemo(() => {
    let filtered = [...(data?.channels || [])];
    
    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((ch) => 
        ch.title?.toLowerCase().includes(query) ||
        ch.channelId.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((ch) => ch.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((ch) => !ch.isActive);
    }
    
    // Apply privacy filter
    if (privacyFilter === "public") {
      filtered = filtered.filter((ch) => !ch.isPrivate);
    } else if (privacyFilter === "private") {
      filtered = filtered.filter((ch) => ch.isPrivate);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (sortField === "createdAt") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "updatedAt") {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [data?.channels, debouncedSearchQuery, statusFilter, privacyFilter, sortField, sortOrder]);
  
  const activeChannels = useMemo(() => channels.filter((ch) => ch.isActive), [channels]);
  const inactiveChannels = useMemo(() => channels.filter((ch) => !ch.isActive), [channels]);

  // Pagination calculations for active channels
  const activeTotalPages = Math.ceil(activeChannels.length / ITEMS_PER_PAGE);
  const paginatedActiveChannels = useMemo(() => {
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    return activeChannels.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activeChannels, activePage]);

  // Pagination calculations for inactive channels
  const inactiveTotalPages = Math.ceil(inactiveChannels.length / ITEMS_PER_PAGE);
  const paginatedInactiveChannels = useMemo(() => {
    const startIndex = (inactivePage - 1) * ITEMS_PER_PAGE;
    return inactiveChannels.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [inactiveChannels, inactivePage]);

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">YouTube Channel Management</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your YouTube channels. Add new channels, control visibility, and set privacy settings.
        </p>
      </div>

      {/* Channel Extractor */}
      <div className="mb-8">
        <YouTubeChannelExtractorInline onChannelAdded={() => refetch()} />
      </div>

      {/* Search, Sort, and Filter Row */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-0 flex-1 sm:max-w-[20rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActivePage(1);
                setInactivePage(1);
              }}
              className={cn(
                "pl-9 h-9 text-muted-foreground placeholder:text-muted-foreground/60",
                searchQuery ? "pr-20" : "pr-12"
              )}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  onClick={() => {
                    setSearchQuery("");
                    setActivePage(1);
                    setInactivePage(1);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              {/* Sort Dropdown - Inside Search Bar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 cursor-pointer",
                      sortOrder !== "asc" && "text-primary"
                    )}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2">
                    <div className="text-xs font-medium mb-2 px-2">Sort by</div>
                    {[
                      { value: "title", label: "Title" },
                      { value: "createdAt", label: "Date Added" },
                      { value: "updatedAt", label: "Last Updated" },
                    ].map((field) => (
                      <DropdownMenuItem
                        key={field.value}
                        onClick={() => {
                          if (sortField === field.value) {
                            setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                          } else {
                            setSortField(field.value as typeof sortField);
                            setSortOrder("asc");
                          }
                          setActivePage(1);
                          setInactivePage(1);
                        }}
                        className={cn(
                          "cursor-pointer",
                          sortField === field.value && "bg-accent"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {sortField === field.value && sortOrder === "desc" && (
                            <ArrowDown className="h-4 w-4" />
                          )}
                          {sortField === field.value && sortOrder === "asc" && (
                            <ArrowUp className="h-4 w-4" />
                          )}
                          {sortField !== field.value && <div className="h-4 w-4" />}
                          {field.label}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortOrder("asc");
                      setActivePage(1);
                      setInactivePage(1);
                    }}
                    className={cn("cursor-pointer", sortOrder === "asc" && "bg-accent")}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      A-Z / Oldest First
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortOrder("desc");
                      setActivePage(1);
                      setInactivePage(1);
                    }}
                    className={cn("cursor-pointer", sortOrder === "desc" && "bg-accent")}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4" />
                      Z-A / Newest First
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filter Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFilterRowOpen(!isFilterRowOpen)}
                className={cn(
                  "h-9 w-9 rounded-full cursor-pointer",
                  (statusFilter !== "all" || privacyFilter !== "all") && "bg-primary/10 text-primary"
                )}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter channels</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Filter Row - Collapsible */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isFilterRowOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="overflow-x-auto scrollbar-hide pb-2">
            <div className="flex items-center gap-4 min-w-max px-1">
              {/* Status Filter */}
              <DropdownMenu
                open={openDropdowns["Status"] || false}
                onOpenChange={(open) => setOpenDropdowns((prev) => ({ ...prev, Status: open }))}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setOpenDropdowns((prev) => ({ ...prev, Status: !prev.Status }))}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/80 hover:text-foreground dark:hover:text-foreground transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:outline-none rounded-sm px-2 py-1"
                  >
                    <span>Status:</span>
                    <span className="font-medium">
                      {statusFilter === "all" ? "All" : statusFilter === "active" ? "Active" : "Inactive"}
                    </span>
                    {openDropdowns["Status"] ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        setStatusFilter(option.value as typeof statusFilter);
                        setOpenDropdowns((prev) => ({ ...prev, Status: false }));
                        setActivePage(1);
                        setInactivePage(1);
                      }}
                      className={cn("cursor-pointer", statusFilter === option.value && "bg-accent")}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Privacy Filter */}
              <DropdownMenu
                open={openDropdowns["Privacy"] || false}
                onOpenChange={(open) => setOpenDropdowns((prev) => ({ ...prev, Privacy: open }))}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setOpenDropdowns((prev) => ({ ...prev, Privacy: !prev.Privacy }))}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/80 hover:text-foreground dark:hover:text-foreground transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:outline-none rounded-sm px-2 py-1"
                  >
                    <span>Privacy:</span>
                    <span className="font-medium">
                      {privacyFilter === "all" ? "All" : privacyFilter === "public" ? "Public" : "Private"}
                    </span>
                    {openDropdowns["Privacy"] ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {[
                    { value: "all", label: "All" },
                    { value: "public", label: "Public" },
                    { value: "private", label: "Private" },
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        setPrivacyFilter(option.value as typeof privacyFilter);
                        setOpenDropdowns((prev) => ({ ...prev, Privacy: false }));
                        setActivePage(1);
                        setInactivePage(1);
                      }}
                      className={cn("cursor-pointer", privacyFilter === option.value && "bg-accent")}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Filters */}
              {(statusFilter !== "all" || privacyFilter !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setPrivacyFilter("all");
                    setSearchQuery("");
                    setActivePage(1);
                    setInactivePage(1);
                  }}
                  className="text-xs"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Channels */}
      {isLoading ? (
        <div className="mb-8">
          <Skeleton className="h-7 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <YouTubeChannelCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load channels</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      ) : (
        <>
          {activeChannels.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Active Channels ({activeChannels.length})
                </h2>
                {activeTotalPages > 1 && (
                  <span className="text-sm text-muted-foreground">
                    Page {activePage} of {activeTotalPages}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedActiveChannels.map((channel) => (
                  <YouTubeChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
              
              {/* Active Channels Pagination */}
              {activeTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActivePage((prev) => Math.max(1, prev - 1))}
                    disabled={activePage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: activeTotalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === activeTotalPages ||
                          (page >= activePage - 1 && page <= activePage + 1)
                        );
                      })
                      .map((page, index, array) => {
                        const showEllipsisBefore = index > 0 && array[index - 1] < page - 1;
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsisBefore && (
                              <span className="text-muted-foreground px-2">...</span>
                            )}
                            <Button
                              variant={activePage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setActivePage(page)}
                              className="min-w-[2.5rem]"
                            >
                              {page}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActivePage((prev) => Math.min(activeTotalPages, prev + 1))}
                    disabled={activePage === activeTotalPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {inactiveChannels.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Inactive Channels ({inactiveChannels.length})
                </h2>
                {inactiveTotalPages > 1 && (
                  <span className="text-sm text-muted-foreground">
                    Page {inactivePage} of {inactiveTotalPages}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedInactiveChannels.map((channel) => (
                  <YouTubeChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
              
              {/* Inactive Channels Pagination */}
              {inactiveTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInactivePage((prev) => Math.max(1, prev - 1))}
                    disabled={inactivePage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: inactiveTotalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === inactiveTotalPages ||
                          (page >= inactivePage - 1 && page <= inactivePage + 1)
                        );
                      })
                      .map((page, index, array) => {
                        const showEllipsisBefore = index > 0 && array[index - 1] < page - 1;
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsisBefore && (
                              <span className="text-muted-foreground px-2">...</span>
                            )}
                            <Button
                              variant={inactivePage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setInactivePage(page)}
                              className="min-w-[2.5rem]"
                            >
                              {page}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInactivePage((prev) => Math.min(inactiveTotalPages, prev + 1))}
                    disabled={inactivePage === inactiveTotalPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {channels.length === 0 && (
            <div className="text-center py-12 border rounded-lg">
              <Youtube className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No channels added yet. Use the form above to add your first channel.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

