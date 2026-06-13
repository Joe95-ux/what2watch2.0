"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { YouTubeChannelCardPage, YouTubeChannelCardPageSkeleton } from "./youtube-channel-card-page";
import { YouTubeChannelCardHorizontal, YouTubeChannelCardHorizontalSkeleton } from "./youtube-channel-card-horizontal";
import { useYouTubeCardStyle, useUpdateYouTubeCardStyle } from "@/hooks/use-youtube-card-style";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Rows3, Plus } from "lucide-react";
import { GroupedPagination } from "@/components/ui/pagination";
import { FilterRow, FilterSearchBar } from "@/components/ui/filter-search-bar";
import { AddYouTubeChannelModal } from "@/components/youtube/add-youtube-channel-modal";
import { toast } from "sonner";

const CHANNELS_PER_PAGE = 32;

interface Channel {
  id: string;
  channelId: string;
  slug?: string | null;
  title: string | null;
  thumbnail: string | null;
  channelUrl: string | null;
  categories: string[];
  rating: {
    average: number;
    count: number;
  } | null;
  subscriberCount?: string;
  videoCount?: string;
  inUserPool?: boolean;
}

export function YouTubeChannelsTab() {
  const { isLoaded, isSignedIn } = useUser();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [poolFilter, setPoolFilter] = useState<"all" | "inMyFeed" | "notInMyFeed">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const { data: cardStyle } = useYouTubeCardStyle();
  const effectiveCardStyle = cardStyle || "centered";
  const updateCardStyle = useUpdateYouTubeCardStyle();

  const { data, isLoading } = useQuery<{
    channels: Channel[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    availableCategories: string[];
  }>({
    queryKey: ["youtube-channels-all", page, categoryFilter, searchQuery, poolFilter, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: CHANNELS_PER_PAGE.toString(),
        pool: poolFilter,
        sort: sortOrder,
      });
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      const response = await fetch(`/api/youtube/channels/all?${params}`);
      if (!response.ok) throw new Error("Failed to fetch channels");
      return response.json();
    },
  });

  const channels = data?.channels ?? [];
  const pagination = data?.pagination;
  const availableCategories = data?.availableCategories ?? [];

  const channelFilters = useMemo(
    () => [
      {
        label: "Feed",
        value: poolFilter,
        options: [
          { value: "all", label: "All Channels" },
          { value: "inMyFeed", label: "In My Feed" },
          { value: "notInMyFeed", label: "Not In My Feed" },
        ],
        onValueChange: (value: string) => {
          setPoolFilter(value as typeof poolFilter);
          setPage(1);
        },
      },
      ...(availableCategories.length > 0
        ? [
            {
              label: "Category",
              value: categoryFilter,
              options: [
                { value: "all", label: "All categories" },
                ...availableCategories.map((category) => ({
                  value: category,
                  label: category,
                })),
              ],
              onValueChange: (value: string) => {
                setCategoryFilter(value);
                setPage(1);
              },
            },
          ]
        : []),
    ],
    [poolFilter, categoryFilter, availableCategories]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (poolFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    return count;
  }, [searchQuery, poolFilter, categoryFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setPoolFilter("all");
    setCategoryFilter("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-md border border-border/70 p-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => updateCardStyle.mutate("centered")}
              disabled={!isLoaded || updateCardStyle.isPending}
              title="Centered cards"
              aria-label="Centered cards"
              aria-pressed={effectiveCardStyle === "centered"}
              className={
                effectiveCardStyle === "centered"
                  ? "h-7 cursor-pointer px-2 text-xs bg-muted text-foreground"
                  : "h-7 cursor-pointer px-2 text-xs"
              }
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => updateCardStyle.mutate("horizontal")}
              disabled={!isLoaded || updateCardStyle.isPending}
              title="Horizontal cards"
              aria-label="Horizontal cards"
              aria-pressed={effectiveCardStyle === "horizontal"}
              className={
                effectiveCardStyle === "horizontal"
                  ? "h-7 cursor-pointer px-2 text-xs bg-muted text-foreground"
                  : "h-7 cursor-pointer px-2 text-xs"
              }
            >
              <Rows3 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 cursor-pointer"
            onClick={() => {
              if (!isSignedIn) {
                toast.info("Sign in to add channels.");
                return;
              }
              setAddChannelOpen(true);
            }}
            disabled={!isLoaded}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add channel
          </Button>
        </div>

        <div className="flex-1 sm:flex-initial">
          <FilterSearchBar
            searchValue={searchQuery}
            onSearchChange={(value) => {
              setSearchQuery(value);
              setPage(1);
            }}
            searchPlaceholder="Search channels..."
            sortOrder={sortOrder}
            onSortChange={(order) => {
              setSortOrder(order);
              setPage(1);
            }}
            filters={channelFilters}
            hasActiveFilters={activeFilterCount > 0}
            onClearAll={clearFilters}
            renderFilterRowOutside
            onFilterRowStateChange={setIsFilterRowOpen}
            iconOnlyControls
            searchMaxWidth="sm:max-w-[24rem] lg:max-w-[28rem]"
            justifyEnd
          />
        </div>
      </div>

      <FilterRow
        filters={channelFilters}
        openDropdowns={openDropdowns}
        setOpenDropdowns={setOpenDropdowns}
        toggleDropdown={(label) =>
          setOpenDropdowns((prev) => ({ ...prev, [label]: !prev[label] }))
        }
        getFilterDisplayValue={(filter) => {
          const option = filter.options.find((opt) => opt.value === filter.value);
          return option?.label || filter.value;
        }}
        handleFilterValueChange={(label, value, onValueChange) => {
          onValueChange(value);
          setOpenDropdowns((prev) => ({ ...prev, [label]: false }));
        }}
        onClearAll={clearFilters}
        hasActiveFilters={activeFilterCount > 0}
        isOpen={isFilterRowOpen}
      />

      <AddYouTubeChannelModal open={addChannelOpen} onOpenChange={setAddChannelOpen} />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: CHANNELS_PER_PAGE }).map((_, index) =>
            effectiveCardStyle === "horizontal" ? (
              <YouTubeChannelCardHorizontalSkeleton key={index} />
            ) : (
              <YouTubeChannelCardPageSkeleton key={index} />
            )
          )}
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">
            {activeFilterCount > 0
              ? "No channels match your filters."
              : poolFilter === "inMyFeed"
                ? "No channels in your feed yet."
                : "No channels found."}
          </p>
          {poolFilter === "inMyFeed" && activeFilterCount === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 cursor-pointer"
              onClick={() => setAddChannelOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add a channel
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {channels.map((channel) =>
              effectiveCardStyle === "horizontal" ? (
                <YouTubeChannelCardHorizontal key={channel.id} channel={channel} />
              ) : (
                <YouTubeChannelCardPage key={channel.id} channel={channel} />
              )
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <GroupedPagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              className="mt-6"
            />
          )}
        </>
      )}
    </div>
  );
}
