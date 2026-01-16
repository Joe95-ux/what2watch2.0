"use client";

import { useState, useMemo, useEffect, Fragment, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { MovieCardSkeleton } from "@/components/skeletons/movie-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Film,
  Tv,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Edit2,
  MoreVertical,
  Download,
  Upload,
  Check,
  GripVertical,
  ArrowLeft,
  Copy,
  Move,
  Plus,
  Eye,
  Lock,
  Youtube,
  Search,
  Heart,
} from "lucide-react";
import Image from "next/image";
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PlaylistItem, Playlist, YouTubePlaylistItem } from "@/hooks/use-playlists";
import { ShareDropdown } from "@/components/ui/share-dropdown";
import { usePlaylistDragDrop } from "@/hooks/use-playlist-drag-drop";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { CollectionBanner } from "@/components/shared/collection-banner";
import { ViewModeToggle, type ViewMode } from "@/components/shared/view-mode-toggle";
import { CollectionPagination } from "@/components/shared/collection-pagination";
import { BulkActionsBar } from "@/components/shared/bulk-actions-bar";
import {
  CollectionFilters,
  type SortField,
  type SortOrder,
  type FilterType,
} from "@/components/shared/collection-filters";
import { 
  useRemoveItemFromPlaylist, 
  useAddItemToPlaylist,
  useReorderPlaylist, 
  useUpdatePlaylist, 
  usePlaylists, 
  useCreatePlaylist
} from "@/hooks/use-playlists";
import { ChangeOrderModal } from "./change-order-modal";
import ImportPlaylistModal from "./import-playlist-modal";
import CreatePlaylistModal from "./create-playlist-modal";
import { reorderPlaylistEntries, type PlaylistEntry } from "@/lib/playlist-utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearch } from "@/hooks/use-search";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import YouTubeVideoCard from "@/components/youtube/youtube-video-card";
import DetailedPlaylistItem from "./detailed-playlist-item";
import { DetailedYouTubePlaylistItem } from "./detailed-youtube-playlist-item";
import { CopyToPlaylistModal } from "./copy-to-playlist-modal";
import { MoveToPlaylistModal } from "./move-to-playlist-modal";
import { FollowButton } from "@/components/social/follow-button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";

interface PlaylistViewProps {
  playlist: Playlist | null;
  playlistId?: string; // Optional: if provided, component will read from cache for immediate optimistic updates
  isLoading: boolean;
  isOwner: boolean;
  enableRemove?: boolean;
  enableEdit?: boolean;
  enableExport?: boolean;
  enablePublicToggle?: boolean;
  onTogglePublic?: (visibility: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE") => Promise<void>;
  onRemove?: (itemId: string) => Promise<void>;
  shareUrl: string;
  onShare?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  errorTitle?: string;
  errorDescription?: string;
  errorAction?: React.ReactNode;
  onBack?: () => void;
  // Like and Follow props for non-owners
  isLiked?: boolean;
  onToggleLike?: () => Promise<void>;
  isLikeLoading?: boolean;
  likeUserId?: string | null;
  showLikeFollow?: boolean;
}

export default function PlaylistView({
  playlist: playlistProp,
  playlistId,
  isLoading,
  isOwner,
  enableRemove = false,
  enableEdit = false,
  enableExport = false,
  enablePublicToggle = false,
  onTogglePublic,
  onRemove,
  shareUrl,
  onShare,
  emptyTitle = "This playlist is empty",
  emptyDescription = "No items have been added yet.",
  emptyAction,
  errorTitle = "Playlist not found",
  errorDescription = "This playlist doesn't exist or is private.",
  errorAction,
  onBack,
  isLiked = false,
  onToggleLike,
  isLikeLoading = false,
  likeUserId = null,
  showLikeFollow = false,
}: PlaylistViewProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  
  // Use playlist prop directly (no complex caching)
  const playlist = playlistProp;

  // Persist viewMode and isEditMode in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("playlist-viewMode");
      return (saved as ViewMode) || "grid";
    }
    return "grid";
  });

  const [isEditMode, setIsEditMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("playlist-editMode");
      return saved === "true";
    }
    return false;
  });

  // Save to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("playlist-viewMode", viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("playlist-editMode", isEditMode.toString());
    }
  }, [isEditMode]);

  // In edit mode, force detailed view
  const effectiveViewMode = isEditMode ? "detailed" : viewMode;
  
  // Determine if playlist is mixed (has both TMDB items and YouTube videos)
  const hasTMDBItems = playlist?.items && playlist.items.length > 0;
  const hasYouTubeItems = playlist?.youtubeItems && playlist.youtubeItems.length > 0;
  const isMixedPlaylist = hasTMDBItems && hasYouTubeItems;
  
  // Separate state for TMDB items and YouTube videos
  const [tmdbFilterType, setTmdbFilterType] = useState<FilterType>("all");
  const [tmdbSortField, setTmdbSortField] = useState<SortField>("listOrder");
  const [tmdbSortOrder, setTmdbSortOrder] = useState<SortOrder>("asc");
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState("");
  const [tmdbCurrentPage, setTmdbCurrentPage] = useState(1);

  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState("");
  const [youtubeCurrentPage, setYoutubeCurrentPage] = useState(1);


  const [itemToRemove, setItemToRemove] = useState<{
    itemId: string;
    title: string;
    isYouTube?: boolean;
  } | null>(null);
  const [isBulkRemoveDialogOpen, setIsBulkRemoveDialogOpen] = useState(false);
  const [bulkRemoveType, setBulkRemoveType] = useState<"tmdb" | "youtube" | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    item: TMDBMovie | TMDBSeries;
    type: "movie" | "tv";
  } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedYouTubeItems, setSelectedYouTubeItems] = useState<Set<string>>(new Set());
  const [isLgScreen, setIsLgScreen] = useState(false);
  const ITEMS_PER_PAGE = 24;
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isEditPlaylistModalOpen, setIsEditPlaylistModalOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [selectedItemsToAdd, setSelectedItemsToAdd] = useState<Set<string>>(new Set());
  const debouncedAddSearchQuery = useDebounce(addSearchQuery, 300);
  const { data: searchResults, isLoading: isSearchLoading } = useSearch({
    query: debouncedAddSearchQuery,
    type: "all",
  });

  const removeItemFromPlaylist = useRemoveItemFromPlaylist();
  const addItemToPlaylist = useAddItemToPlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const queryClient = useQueryClient();

  // Check if screen is lg (1024px and up) for drag and drop
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLgScreen(window.innerWidth >= 1024);
    };

    if (typeof window !== "undefined") {
      checkScreenSize();
      window.addEventListener("resize", checkScreenSize);
      return () => window.removeEventListener("resize", checkScreenSize);
    }
  }, []);

  // Use playlist data directly - optimistic updates handle UI changes
  const displayTMDBItems = playlist?.items || [];
  const displayYouTubeItems = playlist?.youtubeItems || [];

  // Convert playlist items to TMDB format for display
  const playlistAsTMDB = useMemo(() => {
    if (!displayTMDBItems || displayTMDBItems.length === 0) return [];
    return displayTMDBItems.map((item: PlaylistItem) => {
      if (item.mediaType === "movie") {
        const movie: TMDBMovie = {
          id: item.tmdbId,
          title: item.title,
          overview: "",
          poster_path: item.posterPath,
          backdrop_path: item.backdropPath,
          release_date: item.releaseDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          adult: false,
          original_language: "",
          original_title: item.title,
        };
        return { item: movie, type: "movie" as const, playlistItem: item };
      } else {
        const tv: TMDBSeries = {
          id: item.tmdbId,
          name: item.title,
          overview: "",
          poster_path: item.posterPath,
          backdrop_path: item.backdropPath,
          first_air_date: item.firstAirDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          original_language: "",
          original_name: item.title,
        };
        return { item: tv, type: "tv" as const, playlistItem: item };
      }
    });
  }, [playlist]);

  // Full list sorted by order (for drag and drop reordering) - TMDB items only
  const fullSortedByOrder = useMemo(() => {
    const sorted = [...playlistAsTMDB];
    sorted.sort((a, b) => {
      const aOrder = a.playlistItem.order || 0;
      const bOrder = b.playlistItem.order || 0;

      // Items with order come first
      if (aOrder > 0 && bOrder === 0) return -1;
      if (aOrder === 0 && bOrder > 0) return 1;

      // If both have order, sort by order
      if (aOrder > 0 && bOrder > 0) {
        return aOrder - bOrder;
      }

      // If neither has order, sort by createdAt
      return (
        new Date(b.playlistItem.createdAt).getTime() -
        new Date(a.playlistItem.createdAt).getTime()
      );
    });
    return sorted;
  }, [playlistAsTMDB]);

  // Filter and sort TMDB items
  const filteredAndSortedTMDB = useMemo(() => {
    let filtered = [...playlistAsTMDB];

    // Search filter
    if (tmdbSearchQuery.trim()) {
      const query = tmdbSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((entry) => {
        const title =
          "title" in entry.item ? entry.item.title : entry.item.name;
        return title?.toLowerCase().includes(query);
      });
    }

    // Type filter
    if (tmdbFilterType !== "all") {
      filtered = filtered.filter((entry) => entry.type === tmdbFilterType);
    }

    // Sort based on sortField
    if (tmdbSortField === "listOrder") {
      // List Order: Sort by order field
      filtered.sort((a, b) => {
        const aOrder = a.playlistItem.order || 0;
        const bOrder = b.playlistItem.order || 0;

        // If both have order, sort by order value
        if (aOrder > 0 && bOrder > 0) {
          return aOrder - bOrder;
        }

        // Items with order come before items without order
        if (aOrder > 0 && bOrder === 0) return -1;
        if (aOrder === 0 && bOrder > 0) return 1;

        // If neither has order, sort by createdAt as fallback
        return (
          new Date(b.playlistItem.createdAt).getTime() -
          new Date(a.playlistItem.createdAt).getTime()
        );
      });
    } else {
      // Other sorts: Sort by the selected field, ignore order
      filtered.sort((a, b) => {
        let aValue: string | number | null;
        let bValue: string | number | null;

        switch (tmdbSortField) {
          case "createdAt":
            aValue = new Date(a.playlistItem.createdAt).getTime();
            bValue = new Date(b.playlistItem.createdAt).getTime();
            break;
          case "title":
            aValue = (
              "title" in a.item ? a.item.title : a.item.name || ""
            ).toLowerCase();
            bValue = (
              "title" in b.item ? b.item.title : b.item.name || ""
            ).toLowerCase();
            break;
          case "releaseYear":
            aValue = a.playlistItem.releaseDate
              ? new Date(a.playlistItem.releaseDate).getFullYear()
              : a.playlistItem.firstAirDate
              ? new Date(a.playlistItem.firstAirDate).getFullYear()
              : 0;
            bValue = b.playlistItem.releaseDate
              ? new Date(b.playlistItem.releaseDate).getFullYear()
              : b.playlistItem.firstAirDate
              ? new Date(b.playlistItem.firstAirDate).getFullYear()
              : 0;
            break;
          default:
            return 0;
        }

        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return tmdbSortOrder === "asc" ? 1 : -1;
        if (bValue === null) return tmdbSortOrder === "asc" ? -1 : 1;
        if (aValue < bValue) return tmdbSortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return tmdbSortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [playlistAsTMDB, tmdbSearchQuery, tmdbFilterType, tmdbSortField, tmdbSortOrder]);

  // Filter YouTube videos
  const filteredYouTube = useMemo(() => {
    if (!displayYouTubeItems || displayYouTubeItems.length === 0) return [];
    let filtered = [...displayYouTubeItems];

    // Search filter
    if (youtubeSearchQuery.trim()) {
      const query = youtubeSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) =>
        item.title?.toLowerCase().includes(query)
      );
    }

    // Sort by order only if NOT a mixed playlist (YouTube-only playlists can have ordering)
    // In mixed playlists, YouTube videos are sorted by creation date (newest first)
    if (isMixedPlaylist) {
      filtered.sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      });
    } else {
      // YouTube-only playlist: sort by order
      filtered.sort((a, b) => {
        const aOrder = a.order || 0;
        const bOrder = b.order || 0;
        if (aOrder > 0 && bOrder > 0) return aOrder - bOrder;
        if (aOrder > 0 && bOrder === 0) return -1;
        if (aOrder === 0 && bOrder > 0) return 1;
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      });
    }

    return filtered;
  }, [playlist?.youtubeItems, youtubeSearchQuery, isMixedPlaylist]);

  // Pagination for TMDB items
  const tmdbTotalPages = Math.ceil(filteredAndSortedTMDB.length / ITEMS_PER_PAGE);
  const paginatedTMDB = useMemo(() => {
    const startIndex = (tmdbCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSortedTMDB.slice(startIndex, endIndex);
  }, [filteredAndSortedTMDB, tmdbCurrentPage]);


  // Pagination for YouTube videos
  const youtubeTotalPages = Math.ceil(filteredYouTube.length / ITEMS_PER_PAGE);
  const paginatedYouTube = useMemo(() => {
    const startIndex = (youtubeCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredYouTube.slice(startIndex, endIndex);
  }, [filteredYouTube, youtubeCurrentPage]);


  // Reset to page 1 when filters change
  useEffect(() => {
    setTmdbCurrentPage(1);
  }, [tmdbSearchQuery, tmdbFilterType, tmdbSortField, tmdbSortOrder]);

  useEffect(() => {
    setYoutubeCurrentPage(1);
  }, [youtubeSearchQuery]);

  // Page numbers with ellipsis for TMDB
  const tmdbPageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (tmdbTotalPages <= 7) {
      for (let i = 1; i <= tmdbTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (tmdbCurrentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, tmdbCurrentPage - 1);
      const end = Math.min(tmdbTotalPages - 1, tmdbCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== tmdbTotalPages) {
          pages.push(i);
        }
      }
      if (tmdbCurrentPage < tmdbTotalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(tmdbTotalPages);
    }
    return pages;
  }, [tmdbCurrentPage, tmdbTotalPages]);

  // Page numbers with ellipsis for YouTube
  const youtubePageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (youtubeTotalPages <= 7) {
      for (let i = 1; i <= youtubeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (youtubeCurrentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, youtubeCurrentPage - 1);
      const end = Math.min(youtubeTotalPages - 1, youtubeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== youtubeTotalPages) {
          pages.push(i);
        }
      }
      if (youtubeCurrentPage < youtubeTotalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(youtubeTotalPages);
    }
    return pages;
  }, [youtubeCurrentPage, youtubeTotalPages]);

  // Full list sorted by order for YouTube items (for drag and drop reordering) - YouTube-only playlists
  const fullSortedYouTubeByOrder = useMemo(() => {
    if (!displayYouTubeItems || displayYouTubeItems.length === 0 || isMixedPlaylist) return [];
    const sorted = [...displayYouTubeItems];
    sorted.sort((a, b) => {
      const aOrder = a.order || 0;
      const bOrder = b.order || 0;
      if (aOrder > 0 && bOrder === 0) return -1;
      if (aOrder === 0 && bOrder > 0) return 1;
      if (aOrder > 0 && bOrder > 0) {
        return aOrder - bOrder;
      }
      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    });
    return sorted;
  }, [playlist?.youtubeItems, isMixedPlaylist]);

  // Memoize TMDB entries for drag-and-drop to prevent flicker
  const tmdbFilteredEntries = useMemo(() => {
    return filteredAndSortedTMDB.map(({ item, type, playlistItem }) => ({
      item,
      type,
      playlistItem,
    })) as PlaylistEntry[];
  }, [filteredAndSortedTMDB]);

  const tmdbAllEntries = useMemo(() => {
    return fullSortedByOrder.map(({ item, type, playlistItem }) => ({
      item,
      type,
      playlistItem,
    })) as PlaylistEntry[];
  }, [fullSortedByOrder]);

  // Memoize YouTube entries for drag-and-drop to prevent flicker
  const youtubeFilteredEntries = useMemo(() => {
    return filteredYouTube.map((youtubeItem) => ({
      item: youtubeItem,
      type: "youtube" as const,
      playlistItem: { id: youtubeItem.id, order: youtubeItem.order, videoId: youtubeItem.videoId },
    })) as PlaylistEntry[];
  }, [filteredYouTube]);

  const youtubeAllEntries = useMemo(() => {
    return fullSortedYouTubeByOrder.map((youtubeItem) => ({
      item: youtubeItem,
      type: "youtube" as const,
      playlistItem: { id: youtubeItem.id, order: youtubeItem.order, videoId: youtubeItem.videoId },
    })) as PlaylistEntry[];
  }, [fullSortedYouTubeByOrder]);

  // Drag and drop hook for TMDB items
  const { DragDropContext: TMDBDragDropContext, handleDragEnd: handleTMDBDragEnd, isDragEnabled: isTMDBDragEnabled, displayedEntries: tmdbDisplayedEntries } = usePlaylistDragDrop({
    playlistId: playlist?.id || "",
    filteredEntries: tmdbFilteredEntries,
    allEntries: tmdbAllEntries,
    isEditMode: isEditMode && enableEdit && tmdbSortField === "listOrder",
    isLgScreen,
    sortField: tmdbSortField,
    itemType: "tmdb",
  });

  // Drag and drop hook for YouTube items (only in YouTube-only playlists)
  const { DragDropContext: YouTubeDragDropContext, handleDragEnd: handleYouTubeDragEnd, isDragEnabled: isYouTubeDragEnabled, displayedEntries: youtubeDisplayedEntries } = usePlaylistDragDrop({
    playlistId: playlist?.id || "",
    filteredEntries: youtubeFilteredEntries,
    allEntries: youtubeAllEntries,
    isEditMode: isEditMode && enableEdit && !isMixedPlaylist,
    isLgScreen,
    sortField: "listOrder",
    itemType: "youtube",
  });

  const handleRemove = async () => {
    if (!itemToRemove || !playlist) return;
    try {
      if (itemToRemove.isYouTube) {
        // Handle YouTube item removal
        // Find the YouTube item to get videoId
        const youtubeItem = displayYouTubeItems.find((item) => item.id === itemToRemove.itemId);
        if (!youtubeItem) {
          toast.error("YouTube item not found");
          setItemToRemove(null);
          return;
        }

        const res = await fetch(
          `/api/youtube/videos/${youtubeItem.videoId}/playlist?playlistId=${playlist.id}&itemId=${itemToRemove.itemId}`,
          {
            method: "DELETE",
          }
        );

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to remove YouTube item from playlist");
        }

        // Invalidate queries to refresh the playlist
        queryClient.invalidateQueries({ queryKey: ["playlists"] });
        queryClient.invalidateQueries({ queryKey: ["playlist", playlist.id] });

        toast.success("Removed from playlist");
      } else {
        if (onRemove) {
          await onRemove(itemToRemove.itemId);
          // Don't show toast here - let the parent component handle it
        } else {
          await removeItemFromPlaylist.mutateAsync({
            playlistId: playlist.id,
            itemId: itemToRemove.itemId,
          });
          toast.success("Removed from playlist");
        }
      }
      setItemToRemove(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to remove from playlist";
      toast.error(errorMessage);
    }
  };

  const handleBulkRemove = async (isYouTube = false) => {
    if (isYouTube) {
      // Handle YouTube bulk removal
      if (selectedYouTubeItems.size === 0 || !playlist) return;
      try {
        // Remove YouTube items
        for (const itemId of selectedYouTubeItems) {
          // Find the YouTube item to get videoId
          const youtubeItem = displayYouTubeItems.find((item) => item.id === itemId);
          if (!youtubeItem) continue;

          const res = await fetch(
            `/api/youtube/videos/${youtubeItem.videoId}/playlist?playlistId=${playlist.id}&itemId=${itemId}`,
            {
              method: "DELETE",
            }
          );

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to remove YouTube item from playlist");
          }
        }

        // Invalidate queries to refresh the playlist
        queryClient.invalidateQueries({ queryKey: ["playlists"] });
        queryClient.invalidateQueries({ queryKey: ["playlist", playlist.id] });

        toast.success(
          `Removed ${selectedYouTubeItems.size} item${selectedYouTubeItems.size > 1 ? "s" : ""} from playlist`
        );
        setSelectedYouTubeItems(new Set());
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to remove YouTube items";
        toast.error(errorMessage);
      }
    } else {
      // Handle TMDB bulk removal
      if (selectedItems.size === 0 || !playlist) return;
      try {
        // Remove TMDB items
        for (const itemId of selectedItems) {
          if (onRemove) {
            // Pass suppressToast=true to prevent individual toasts
            await (onRemove as (itemId: string, suppressToast?: boolean) => Promise<void>)(itemId, true);
          } else {
            await removeItemFromPlaylist.mutateAsync({
              playlistId: playlist.id,
              itemId,
            });
          }
        }

        toast.success(
          `Removed ${selectedItems.size} item${selectedItems.size > 1 ? "s" : ""} from playlist`
        );
        setSelectedItems(new Set());
      } catch (error) {
        toast.error("Failed to remove items");
      }
    }
  };

  const confirmBulkRemove = async () => {
    setIsBulkRemoveDialogOpen(false);
    if (bulkRemoveType === "youtube") {
      await handleBulkRemove(true);
    } else {
      await handleBulkRemove(false);
    }
    setBulkRemoveType(null);
  };

  const handleExportCSV = async () => {
    if (!playlist) return;
    try {
      toast.loading("Preparing export...", { id: "export" });

      const response = await fetch(`/api/playlists/${playlist.id}/export`);
      if (!response.ok) {
        throw new Error("Failed to export playlist");
      }

      const { items } = await response.json();

      const headers = [
        "Order",
        "Title",
        "Type",
        "URL",
        "IMDB ID",
        "Release Date",
        "Year",
        "Genre",
        "Description",
        "Directors/Creators",
        "Runtime",
        "IMDB Rating",
        "Note",
        "Date Created",
      ];

      const rows = items.map((item: any) => [
        item.order,
        item.title,
        item.type,
        item.url,
        item.imdbId,
        item.releaseDate,
        item.year,
        item.genre,
        item.description,
        item.directorsCreators,
        item.runtime,
        item.imdbRating,
        item.note,
        item.dateCreated,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: any[]) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `playlist-${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Playlist exported to CSV", { id: "export" });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export playlist", { id: "export" });
    }
  };

  const toggleItemSelection = (itemId: string, isYouTube = false) => {
    if (isYouTube) {
      const newSelected = new Set(selectedYouTubeItems);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      setSelectedYouTubeItems(newSelected);
    } else {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      setSelectedItems(newSelected);
    }
  };

  const toggleSelectAll = (isYouTube = false) => {
    if (isYouTube) {
      if (selectedYouTubeItems.size === filteredYouTube.length) {
        setSelectedYouTubeItems(new Set());
      } else {
        setSelectedYouTubeItems(
          new Set(filteredYouTube.map((item) => item.id))
        );
      }
    } else {
      if (selectedItems.size === filteredAndSortedTMDB.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(
          new Set(filteredAndSortedTMDB.map(({ playlistItem }) => playlistItem.id))
        );
      }
    }
  };

  const clearFilters = () => {
    setTmdbSearchQuery("");
    setTmdbFilterType("all");
    setYoutubeSearchQuery("");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (tmdbSearchQuery.trim()) count++;
    if (tmdbFilterType !== "all") count++;
    if (youtubeSearchQuery.trim()) count++;
    return count;
  }, [tmdbSearchQuery, tmdbFilterType, youtubeSearchQuery]);

  // Get banner image
  const bannerImage = playlist?.coverImage
    ? playlist.coverImage
    : playlist && playlist.items && playlist.items.length > 0 && playlist.items[0].backdropPath
    ? getBackdropUrl(playlist.items[0].backdropPath, "original")
    : playlist && playlist.items && playlist.items.length > 0 && playlist.items[0].posterPath
    ? getPosterUrl(playlist.items[0].posterPath, "original")
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <CollectionBanner fallbackGradient />
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!playlist || ((!playlist.items || playlist.items.length === 0) && (!playlist.youtubeItems || playlist.youtubeItems.length === 0) && !isLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <CollectionBanner fallbackGradient />
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">{errorTitle}</h2>
            <p className="text-muted-foreground mb-4">{errorDescription}</p>
            {errorAction}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Banner Section */}
        <CollectionBanner imageUrl={bannerImage} />

        {/* Info Section */}
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Playlists
            </Button>
          )}

          <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
            <div className="flex-1">
              {playlist.user && (
                <div className="flex items-center gap-3 mb-4">
                  <Link href={`/users/${playlist.user.username || playlist.user.id}`}>
                    <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 ring-primary transition-all">
                      <AvatarImage
                        src={
                          currentUser?.id === playlist.user.id && contextAvatarUrl
                            ? contextAvatarUrl
                            : playlist.user.avatarUrl || undefined
                        }
                        alt={playlist.user.username || playlist.user.displayName || "User"}
                      />
                      <AvatarFallback>
                        {(playlist.user.displayName ||
                          playlist.user.username ||
                          "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Created by{" "}
                      <Link
                        href={`/users/${playlist.user.username || playlist.user.id}`}
                        className="hover:text-primary transition-colors cursor-pointer"
                      >
                        {playlist.user.username || playlist.user.displayName || "Unknown"}
                      </Link>
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  {playlist.name}
                </h1>
                {isEditMode && enableEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => setIsEditPlaylistModalOpen(true)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {playlist.description && (
                <p className="text-base sm:text-lg text-muted-foreground mb-4 max-w-2xl">
                  {playlist.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {playlist.user && (
                  <>
                    <span>
                      Created by{" "}
                      <Link
                        href={`/users/${playlist.user.username || playlist.user.id}`}
                        className="hover:text-primary transition-colors cursor-pointer"
                      >
                        {playlist.user.username || playlist.user.displayName || "Unknown"}
                      </Link>
                    </span>
                    <span>•</span>
                  </>
                )}
                <span>
                  {filteredAndSortedTMDB.length + filteredYouTube.length} of{" "}
                  {(playlist.items?.length || 0) + (playlist.youtubeItems?.length || 0)}{" "}
                  {((playlist.items?.length || 0) + (playlist.youtubeItems?.length || 0)) === 1 ? "item" : "items"}
                </span>
                {isOwner && (
                  <>
                    <span>•</span>
                    <span className="capitalize">
                      {playlist.visibility === "PUBLIC" || (playlist.visibility === undefined && playlist.isPublic)
                        ? "public"
                        : playlist.visibility === "FOLLOWERS_ONLY"
                        ? "followers only"
                        : "private"}
                    </span>
                  </>
                )}
                {activeFilterCount > 0 && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      {activeFilterCount}{" "}
                      {activeFilterCount === 1 ? "filter" : "filters"} active
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="overflow-x-auto max-w-full">
              <div className="flex items-center gap-2">
                {showLikeFollow && !isOwner && playlist && (playlist.visibility === "PUBLIC" || playlist.isPublic || playlist.visibility === "FOLLOWERS_ONLY") && (
                  <>
                    <Button
                      variant={isLiked ? "default" : "outline"}
                      size="sm"
                      onClick={onToggleLike}
                      disabled={isLikeLoading || !likeUserId}
                      className="cursor-pointer flex-shrink-0"
                    >
                      <Heart className={cn("h-4 w-4 mr-2", isLiked && "fill-current")} />
                      {isLiked ? "Liked" : "Like"}
                      {(() => {
                        const likesCount = playlist.likesCount ?? playlist._count?.likedBy ?? 0;
                        return likesCount > 0 && (
                          <span className="ml-2">({likesCount})</span>
                        );
                      })()}
                    </Button>
                    {playlist.user && (
                      <div className="flex-shrink-0">
                        <FollowButton userId={playlist.user.id} size="sm" />
                      </div>
                    )}
                  </>
                )}
                <ShareDropdown
                  shareUrl={shareUrl}
                  title={playlist.name}
                  description={`Check out ${playlist.name} on What2Watch`}
                  onShare={onShare}
                  className="gap-2 cursor-pointer flex-shrink-0"
                />
                {enablePublicToggle && onTogglePublic && isOwner && (
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md border",
                      playlist.visibility === "PUBLIC" || playlist.isPublic
                        ? "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-400"
                        : playlist.visibility === "FOLLOWERS_ONLY"
                        ? "bg-purple-500/20 border-purple-500/30 text-purple-700 dark:text-purple-400"
                        : "bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-400"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Switch
                      id="public-toggle"
                      checked={playlist.visibility === "PUBLIC" || playlist.isPublic}
                      onCheckedChange={async (checked) => {
                        try {
                          await onTogglePublic(checked ? "PUBLIC" : "PRIVATE");
                          toast.success(
                            checked ? "Playlist is now public" : "Playlist is now private"
                          );
                        } catch {
                          toast.error("Failed to update playlist visibility");
                        }
                      }}
                    />
                    <Label
                      htmlFor="public-toggle"
                      className="text-sm cursor-pointer flex items-center gap-1.5"
                    >
                      {playlist.visibility === "PUBLIC" || playlist.isPublic ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      <span>
                        {playlist.visibility === "PUBLIC" || playlist.isPublic
                          ? "Public"
                          : playlist.visibility === "FOLLOWERS_ONLY"
                          ? "Followers"
                          : "Private"}
                      </span>
                    </Label>
                  </div>
                )}
                {isOwner && (enableEdit || enableExport) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {enableEdit && (
                        <DropdownMenuItem
                          onClick={() => setIsEditMode(!isEditMode)}
                          className="cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          {isEditMode ? "Exit Edit Mode" : "Edit"}
                        </DropdownMenuItem>
                      )}
                      {enableExport && (
                        <>
                          <DropdownMenuItem
                            onClick={handleExportCSV}
                            className="cursor-pointer"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setIsImportModalOpen(true)}
                            className="cursor-pointer"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Import CSV
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar - TMDB Items Only */}
        {isEditMode && enableRemove && hasTMDBItems && filteredAndSortedTMDB.length > 0 && (
          <div className="container max-w-7xl mx-auto mt-[1rem] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 py-4 border-b border-border bg-muted/30 rounded-lg px-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSelectAll(false)}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <div className="h-4 w-4 mr-2 flex items-center justify-center">
                    {selectedItems.size === filteredAndSortedTMDB.length ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-current rounded" />
                    )}
                  </div>
                  {selectedItems.size === filteredAndSortedTMDB.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {selectedItems.size} of {filteredAndSortedTMDB.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Popover
                  open={isAddToPlaylistOpen}
                  onOpenChange={(open) => {
                    setIsAddToPlaylistOpen(open);
                    if (!open) {
                      setSelectedItemsToAdd(new Set());
                      setAddSearchQuery("");
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer w-full sm:w-auto hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Playlist
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[400px] p-0 max-w-[calc(100vw-1rem)] mx-[0.5rem] sm:mx-0"
                    align="end"
                  >
                    <div className="p-4 border-b space-y-3">
                      <Input
                        placeholder="Search movies or TV shows..."
                        value={addSearchQuery}
                        onChange={(e) => setAddSearchQuery(e.target.value)}
                        className="w-full"
                        autoFocus
                      />
                      {debouncedAddSearchQuery.trim() && searchResults?.results && searchResults.results.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {selectedItemsToAdd.size} selected
                          </span>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={async () => {
                              if (!playlist || selectedItemsToAdd.size === 0) return;

                              const itemsToAdd = Array.from(selectedItemsToAdd)
                                .map((key) => {
                                  const [id, type] = key.split("-");
                                  const item = searchResults.results.find(
                                    (i) => `${i.id}-${"title" in i ? "movie" : "tv"}` === key
                                  );
                                  if (!item) return null;
                                  const isMovie = "title" in item;
                                  return {
                                    tmdbId: parseInt(id),
                                    mediaType: type as "movie" | "tv",
                                    title: isMovie ? item.title : item.name,
                                    posterPath: item.poster_path || null,
                                    backdropPath: item.backdrop_path || null,
                                    releaseDate: isMovie
                                      ? (item.release_date ?? undefined)
                                      : undefined,
                                    firstAirDate: !isMovie
                                      ? (item.first_air_date ?? undefined)
                                      : undefined,
                                  };
                                })
                                .filter((item): item is NonNullable<typeof item> => item !== null);

                              try {
                                // Add items one by one to handle errors gracefully
                                let successCount = 0;
                                let errorCount = 0;
                                for (const item of itemsToAdd) {
                                  try {
                                    await addItemToPlaylist.mutateAsync({
                                      playlistId: playlist.id,
                                      item,
                                    });
                                    successCount++;
                                  } catch (error) {
                                    errorCount++;
                                    console.error(`Failed to add ${item.title}:`, error);
                                  }
                                }

                                if (successCount > 0) {
                                  toast.success(
                                    `Added ${successCount} item${successCount > 1 ? "s" : ""} to playlist`
                                  );
                                }
                                if (errorCount > 0) {
                                  toast.error(
                                    `Failed to add ${errorCount} item${errorCount > 1 ? "s" : ""}`
                                  );
                                }

                                setSelectedItemsToAdd(new Set());
                                setAddSearchQuery("");
                                setIsAddToPlaylistOpen(false);
                              } catch (error) {
                                toast.error("Failed to add items to playlist");
                                console.error(error);
                              }
                            }}
                            disabled={selectedItemsToAdd.size === 0 || addItemToPlaylist.isPending}
                            className="h-7 text-xs"
                          >
                            Add Selected ({selectedItemsToAdd.size})
                          </Button>
                        </div>
                      )}
                    </div>
                    {!debouncedAddSearchQuery.trim() ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Start typing to search for movies or TV shows
                      </div>
                    ) : (
                      <div className="h-auto max-h-[400px] p-2 overflow-y-auto scrollbar-thin">
                        {isSearchLoading ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Searching...
                          </div>
                        ) : searchResults?.results && searchResults.results.length > 0 ? (
                          <div className="p-2">
                            {searchResults.results.map((item) => {
                              const isMovie = "title" in item;
                              const title = isMovie ? item.title : item.name;
                              const mediaType = isMovie ? "movie" : "tv";
                              const itemKey = `${item.id}-${mediaType}`;
                              const isInPlaylist = playlist?.items?.some(
                                (i: PlaylistItem) =>
                                  i.tmdbId === item.id &&
                                  i.mediaType === mediaType
                              ) || false;
                              const isSelected = selectedItemsToAdd.has(itemKey);

                              return (
                                <div
                                  key={itemKey}
                                  className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors",
                                    isInPlaylist && "opacity-50"
                                  )}
                                >
                                  <Checkbox
                                    checked={isInPlaylist || isSelected}
                                    disabled={isInPlaylist}
                                    onCheckedChange={(checked) => {
                                      if (isInPlaylist) return;
                                      const newSelected = new Set(selectedItemsToAdd);
                                      if (checked) {
                                        newSelected.add(itemKey);
                                      } else {
                                        newSelected.delete(itemKey);
                                      }
                                      setSelectedItemsToAdd(newSelected);
                                    }}
                                    className="flex-shrink-0"
                                  />
                                  {item.poster_path ? (
                                    <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
                                      <Image
                                        src={getPosterUrl(item.poster_path)}
                                        alt={title}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-16 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                                      {isMovie ? (
                                        <Film className="h-6 w-6 text-muted-foreground" />
                                      ) : (
                                        <Tv className="h-6 w-6 text-muted-foreground" />
                                      )}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {title}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {mediaType}
                                    </p>
                                  </div>
                                  {isInPlaylist && (
                                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No results found
                          </div>
                        )}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Movies & TV Shows Section */}
          {playlist.items && playlist.items.length > 0 && (
            <div className="mb-12">
              {/* Mobile: Title on top, actions/search below */}
              <div className="flex flex-col gap-4 mb-6">
                <h2 className="text-xl font-semibold">Movies & TV Shows</h2>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {isEditMode && enableEdit ? (
                    <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCopyModalOpen(true)}
                        disabled={selectedItems.size === 0}
                        className="cursor-pointer flex-shrink-0"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy ({selectedItems.size})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsMoveModalOpen(true)}
                        disabled={selectedItems.size === 0}
                        className="cursor-pointer flex-shrink-0"
                      >
                        <Move className="h-4 w-4 mr-2" />
                        Move ({selectedItems.size})
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setBulkRemoveType("tmdb");
                          setIsBulkRemoveDialogOpen(true);
                        }}
                        disabled={selectedItems.size === 0}
                        className="cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete ({selectedItems.size})
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                    </div>
                  )}
                  <div className="flex-shrink-0">
                    <CollectionFilters
                      searchQuery={tmdbSearchQuery}
                      onSearchChange={setTmdbSearchQuery}
                      sortField={tmdbSortField}
                      sortOrder={tmdbSortOrder}
                      onSortChange={(field, order) => {
                        setTmdbSortField(field);
                        setTmdbSortOrder(order);
                      }}
                      filterType={tmdbFilterType}
                      onFilterChange={setTmdbFilterType}
                      searchPlaceholder="Search movies & TV shows..."
                      showListOrder={true}
                    />
                  </div>
                </div>
              </div>

              {/* TMDB Content Views */}
              {effectiveViewMode === "grid" ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {paginatedTMDB.map(({ item, type, playlistItem }) => (
                      <div key={playlistItem.id} className="relative">
                        {isEditMode && enableEdit && (
                          <div className="absolute top-2 left-2 z-10">
                            <Button
                              variant={
                                selectedItems.has(playlistItem.id)
                                  ? "default"
                                  : "outline"
                              }
                              size="icon"
                              className={cn(
                                "h-8 w-8 cursor-pointer",
                                selectedItems.has(playlistItem.id) && "bg-primary"
                              )}
                              onClick={() => toggleItemSelection(playlistItem.id)}
                            >
                              {selectedItems.has(playlistItem.id) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <div className="h-4 w-4 border-2 border-current rounded" />
                              )}
                            </Button>
                          </div>
                        )}
                        <MovieCard
                          item={item}
                          type={type}
                          onCardClick={(clickedItem, clickedType) =>
                            setSelectedItem({
                              item: clickedItem,
                              type: clickedType,
                            })
                          }
                          onRemove={
                            enableRemove
                              ? () => {
                                  setItemToRemove({
                                    itemId: playlistItem.id,
                                    title: playlistItem.title,
                                  });
                                }
                              : undefined
                          }
                        />
                      </div>
                    ))}
                  </div>
                  {tmdbTotalPages > 1 && (
                    <CollectionPagination
                      currentPage={tmdbCurrentPage}
                      totalPages={tmdbTotalPages}
                      onPageChange={setTmdbCurrentPage}
                      pageNumbers={tmdbPageNumbers}
                    />
                  )}
                </>
              ) : effectiveViewMode === "table" ? (
                <>
                  <div className="border border-border rounded-lg overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                          <tr>
                            {isEditMode && enableEdit && (
                              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 cursor-pointer"
                                  onClick={() => toggleSelectAll(false)}
                                >
                                  {selectedItems.size === filteredAndSortedTMDB.length ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <div className="h-4 w-4 border-2 border-current rounded" />
                                  )}
                                </Button>
                              </th>
                            )}
                            {tmdbSortField === "listOrder" && !isMixedPlaylist && (
                              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Order
                              </th>
                            )}
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Title
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Type
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Year
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Added
                            </th>
                            {!isEditMode && enableRemove && (
                              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Actions
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedTMDB.map(({ type, playlistItem }) => {
                            const releaseYear = playlistItem.releaseDate
                              ? new Date(playlistItem.releaseDate).getFullYear()
                              : playlistItem.firstAirDate
                              ? new Date(playlistItem.firstAirDate).getFullYear()
                              : "—";

                            return (
                              <tr
                                key={playlistItem.id}
                                className={cn(
                                  "hover:bg-muted/20 transition-colors group cursor-pointer",
                                  isEditMode &&
                                    selectedItems.has(playlistItem.id) &&
                                    "bg-primary/10"
                                )}
                                onClick={() => {
                                  if (isEditMode) {
                                    toggleItemSelection(playlistItem.id);
                                  } else {
                                    router.push(`/${type}/${playlistItem.tmdbId}`);
                                  }
                                }}
                              >
                                {isEditMode && enableEdit && (
                                  <td className="px-4 py-4">
                                    <Button
                                      variant={
                                        selectedItems.has(playlistItem.id)
                                          ? "default"
                                          : "outline"
                                      }
                                      size="icon"
                                      className={cn(
                                        "h-6 w-6 cursor-pointer",
                                        selectedItems.has(playlistItem.id) &&
                                          "bg-primary"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleItemSelection(playlistItem.id);
                                      }}
                                    >
                                      {selectedItems.has(playlistItem.id) ? (
                                        <Check className="h-3 w-3" />
                                      ) : (
                                        <div className="h-3 w-3 border-2 border-current rounded" />
                                      )}
                                    </Button>
                                  </td>
                                )}
                                {tmdbSortField === "listOrder" && (
                                  <td className="px-4 py-4">
                                    <span className="text-sm text-muted-foreground">
                                      {playlistItem.order > 0 ? playlistItem.order : "—"}
                                    </span>
                                  </td>
                                )}
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    {playlistItem.posterPath ? (
                                      <div className="relative w-16 h-24 rounded overflow-hidden flex-shrink-0 bg-muted">
                                        <Image
                                          src={getPosterUrl(playlistItem.posterPath)}
                                          alt={playlistItem.title}
                                          fill
                                          className="object-cover"
                                          sizes="64px"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-16 h-24 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                                        {type === "movie" ? (
                                          <Film className="h-6 w-6 text-muted-foreground" />
                                        ) : (
                                          <Tv className="h-6 w-6 text-muted-foreground" />
                                        )}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                                        {playlistItem.title}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="text-sm text-muted-foreground capitalize">
                                    {type}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="text-sm text-muted-foreground">
                                    {releaseYear}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="text-sm text-muted-foreground">
                                    {format(
                                      new Date(playlistItem.createdAt),
                                      "MMM d, yyyy"
                                    )}
                                  </span>
                                </td>
                                {!isEditMode && enableRemove && (
                                  <td className="px-4 py-4">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setItemToRemove({
                                          itemId: playlistItem.id,
                                          title: playlistItem.title,
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {tmdbTotalPages > 1 && (
                    <CollectionPagination
                      currentPage={tmdbCurrentPage}
                      totalPages={tmdbTotalPages}
                      onPageChange={setTmdbCurrentPage}
                      pageNumbers={tmdbPageNumbers}
                    />
                  )}
                </>
              ) : (
                // Detailed View
                <>
                  <TMDBDragDropContext onDragEnd={handleTMDBDragEnd}>
                    <Droppable droppableId="tmdb-items">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-4"
                        >
                          {(isTMDBDragEnabled ? tmdbDisplayedEntries : paginatedTMDB).map(
                            (entry: PlaylistEntry | { item: TMDBMovie | TMDBSeries; type: "movie" | "tv"; playlistItem: PlaylistItem }, index: number) => {
                              // When drag is enabled, entry is PlaylistEntry; otherwise it's the paginated format
                              let item: TMDBMovie | TMDBSeries;
                              let type: "movie" | "tv";
                              let playlistItem: PlaylistItem;
                              
                              if (isTMDBDragEnabled) {
                                const playlistEntry = entry as PlaylistEntry;
                                item = playlistEntry.item as TMDBMovie | TMDBSeries;
                                type = playlistEntry.type as "movie" | "tv";
                                playlistItem = playlistEntry.playlistItem as PlaylistItem;
                              } else {
                                const paginatedEntry = entry as { item: TMDBMovie | TMDBSeries; type: "movie" | "tv"; playlistItem: PlaylistItem };
                                item = paginatedEntry.item;
                                type = paginatedEntry.type;
                                playlistItem = paginatedEntry.playlistItem;
                              }
                              // When drag is enabled, use actual index; otherwise use paginated index
                              const actualIndex = isTMDBDragEnabled 
                                ? index 
                                : (tmdbCurrentPage - 1) * ITEMS_PER_PAGE + index;
                              // Lock order value during drag to prevent flicker
                              const lockedOrder = tmdbSortField === "listOrder"
                                ? (playlistItem.order && playlistItem.order > 0 ? playlistItem.order : actualIndex + 1)
                                : undefined;
                              return (
                                <Draggable
                                  key={playlistItem.id}
                                  draggableId={playlistItem.id}
                                  index={index}
                                  isDragDisabled={!isTMDBDragEnabled}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        snapshot.isDragging ? "opacity-50" : "",
                                        isTMDBDragEnabled &&
                                          "cursor-grab active:cursor-grabbing"
                                      )}
                                    >
                                      <DetailedPlaylistItem
                                        item={item}
                                        type={type}
                                        playlistItem={playlistItem}
                                        playlistId={playlist.id}
                                        isEditMode={isEditMode && enableEdit}
                                        isSelected={selectedItems.has(playlistItem.id)}
                                        order={lockedOrder}
                                        index={actualIndex}
                                        totalItems={isTMDBDragEnabled ? tmdbDisplayedEntries.length : filteredAndSortedTMDB.length}
                                        onSelect={() =>
                                          toggleItemSelection(playlistItem.id)
                                        }
                                        onRemove={
                                          enableRemove
                                            ? () => {
                                                setItemToRemove({
                                                  itemId: playlistItem.id,
                                                  title: playlistItem.title,
                                                });
                                              }
                                            : undefined
                                        }
                                        onItemClick={() => {
                                          if (isEditMode) {
                                            toggleItemSelection(playlistItem.id);
                                          } else {
                                            setSelectedItem({ item, type });
                                          }
                                        }}
                                        isLgScreen={isLgScreen}
                                        sortField={tmdbSortField}
                                        isPublic={playlist.visibility === "PUBLIC" || playlist.isPublic}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              );
                            }
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </TMDBDragDropContext>
                  {tmdbTotalPages > 1 && !isTMDBDragEnabled && (
                    <CollectionPagination
                      currentPage={tmdbCurrentPage}
                      totalPages={tmdbTotalPages}
                      onPageChange={setTmdbCurrentPage}
                      pageNumbers={tmdbPageNumbers}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* YouTube Videos Section */}
          {playlist.youtubeItems && playlist.youtubeItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">YouTube Videos</h2>
              {/* Bulk Actions and Search Wrapper */}
              {isEditMode && enableEdit ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  {/* Bulk Actions Div */}
                  <div className="flex items-center gap-3 flex-shrink-0 overflow-x-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSelectAll(true)}
                      className="cursor-pointer"
                    >
                      <div className="h-4 w-4 mr-2 flex items-center justify-center">
                        {selectedYouTubeItems.size === filteredYouTube.length ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-current rounded" />
                        )}
                      </div>
                      {selectedYouTubeItems.size === filteredYouTube.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {selectedYouTubeItems.size} of {filteredYouTube.length} selected
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setBulkRemoveType("youtube");
                        setIsBulkRemoveDialogOpen(true);
                      }}
                      disabled={selectedYouTubeItems.size === 0}
                      className="cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedYouTubeItems.size})
                    </Button>
                  </div>
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-80 flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search YouTube videos..."
                      value={youtubeSearchQuery}
                      onChange={(e) => setYoutubeSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search YouTube videos..."
                      value={youtubeSearchQuery}
                      onChange={(e) => setYoutubeSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* YouTube Content Views */}
              {effectiveViewMode === "grid" ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {paginatedYouTube.map((youtubeItem) => (
                      <div key={youtubeItem.id} className="relative">
                        {isEditMode && enableEdit && (
                          <div className="absolute top-2 left-2 z-10">
                            <Button
                              variant={
                                selectedYouTubeItems.has(youtubeItem.id)
                                  ? "default"
                                  : "outline"
                              }
                              size="icon"
                              className={cn(
                                "h-8 w-8 cursor-pointer",
                                selectedYouTubeItems.has(youtubeItem.id) && "bg-primary"
                              )}
                              onClick={() => toggleItemSelection(youtubeItem.id, true)}
                            >
                              {selectedYouTubeItems.has(youtubeItem.id) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <div className="h-4 w-4 border-2 border-current rounded" />
                              )}
                            </Button>
                          </div>
                        )}
                        <YouTubeVideoCard
                          video={{
                            id: youtubeItem.videoId,
                            title: youtubeItem.title,
                            thumbnail: youtubeItem.thumbnail || undefined,
                            description: youtubeItem.description || "",
                            duration: youtubeItem.duration || undefined,
                            publishedAt: youtubeItem.publishedAt || new Date().toISOString(),
                            channelId: youtubeItem.channelId,
                            channelTitle: youtubeItem.channelTitle || "",
                            videoUrl: `https://www.youtube.com/watch?v=${youtubeItem.videoId}`,
                          }}
                          onRemove={
                            enableRemove
                              ? () => {
                                  setItemToRemove({
                                    itemId: youtubeItem.id,
                                    title: youtubeItem.title,
                                    isYouTube: true,
                                  });
                                }
                              : undefined
                          }
                        />
                      </div>
                    ))}
                  </div>
                  {youtubeTotalPages > 1 && (
                    <CollectionPagination
                      currentPage={youtubeCurrentPage}
                      totalPages={youtubeTotalPages}
                      onPageChange={setYoutubeCurrentPage}
                      pageNumbers={youtubePageNumbers}
                    />
                  )}
                </>
              ) : effectiveViewMode === "table" ? (
                <>
                  <div className="border border-border rounded-lg overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                          <tr>
                            {isEditMode && enableEdit && (
                              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 cursor-pointer"
                                  onClick={() => toggleSelectAll(true)}
                                >
                                  {selectedYouTubeItems.size === filteredYouTube.length ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <div className="h-4 w-4 border-2 border-current rounded" />
                                  )}
                                </Button>
                              </th>
                            )}
                            {!isMixedPlaylist && (
                              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Order
                              </th>
                            )}
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Title
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Channel
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Duration
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Added
                            </th>
                            {!isEditMode && enableRemove && (
                              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Actions
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedYouTube.map((youtubeItem) => (
                            <tr
                              key={youtubeItem.id}
                              className={cn(
                                "hover:bg-muted/20 transition-colors group cursor-pointer",
                                isEditMode &&
                                  selectedYouTubeItems.has(youtubeItem.id) &&
                                  "bg-primary/10"
                              )}
                              onClick={() => {
                                if (isEditMode) {
                                  toggleItemSelection(youtubeItem.id, true);
                                } else {
                                  window.open(`https://www.youtube.com/watch?v=${youtubeItem.videoId}`, "_blank");
                                }
                              }}
                            >
                              {isEditMode && enableEdit && (
                                <td className="px-4 py-4">
                                  <Button
                                    variant={
                                      selectedYouTubeItems.has(youtubeItem.id)
                                        ? "default"
                                        : "outline"
                                    }
                                    size="icon"
                                    className={cn(
                                      "h-6 w-6 cursor-pointer",
                                      selectedYouTubeItems.has(youtubeItem.id) &&
                                        "bg-primary"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleItemSelection(youtubeItem.id, true);
                                    }}
                                  >
                                    {selectedYouTubeItems.has(youtubeItem.id) ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <div className="h-3 w-3 border-2 border-current rounded" />
                                    )}
                                  </Button>
                                </td>
                              )}
                              {!isMixedPlaylist && (
                                <td className="px-4 py-4">
                                  <span className="text-sm text-muted-foreground">
                                    {youtubeItem.order > 0 ? youtubeItem.order : "—"}
                                  </span>
                                </td>
                              )}
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  {youtubeItem.thumbnail ? (
                                    <div className="relative w-24 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
                                      <Image
                                        src={youtubeItem.thumbnail}
                                        alt={youtubeItem.title}
                                        fill
                                        className="object-cover"
                                        sizes="96px"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-24 h-16 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                                      <Youtube className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                                      {youtubeItem.title}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-sm text-muted-foreground">
                                  {youtubeItem.channelTitle || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-sm text-muted-foreground">
                                  {youtubeItem.duration ? youtubeItem.duration : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-sm text-muted-foreground">
                                  {format(
                                    new Date(youtubeItem.createdAt),
                                    "MMM d, yyyy"
                                  )}
                                </span>
                              </td>
                              {!isEditMode && enableRemove && (
                                <td className="px-4 py-4">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setItemToRemove({
                                        itemId: youtubeItem.id,
                                        title: youtubeItem.title,
                                        isYouTube: true,
                                      });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {youtubeTotalPages > 1 && (
                    <CollectionPagination
                      currentPage={youtubeCurrentPage}
                      totalPages={youtubeTotalPages}
                      onPageChange={setYoutubeCurrentPage}
                      pageNumbers={youtubePageNumbers}
                    />
                  )}
                </>
              ) : (
                // Detailed View for YouTube
                <>
                  {isYouTubeDragEnabled ? (
                    <YouTubeDragDropContext onDragEnd={handleYouTubeDragEnd}>
                      <Droppable droppableId="youtube-items">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-4"
                          >
                            {(isYouTubeDragEnabled ? youtubeDisplayedEntries : paginatedYouTube).map((entry: PlaylistEntry | YouTubePlaylistItem, index: number) => {
                              // When drag is enabled, entry is PlaylistEntry; otherwise it's YouTubePlaylistItem
                              const youtubeItem = isYouTubeDragEnabled 
                                ? (entry as PlaylistEntry).item as YouTubePlaylistItem
                                : entry as YouTubePlaylistItem;
                              // When drag is enabled, use actual index; otherwise use paginated index
                              const actualIndex = isYouTubeDragEnabled
                                ? index
                                : (youtubeCurrentPage - 1) * ITEMS_PER_PAGE + index;
                              // Lock order value during drag to prevent flicker
                              const lockedOrder = youtubeItem.order && youtubeItem.order > 0 ? youtubeItem.order : actualIndex + 1;
                              return (
                                <Draggable
                                  key={youtubeItem.id}
                                  draggableId={youtubeItem.id}
                                  index={index}
                                  isDragDisabled={!isYouTubeDragEnabled}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        snapshot.isDragging ? "opacity-50" : "",
                                        isYouTubeDragEnabled &&
                                          "cursor-grab active:cursor-grabbing"
                                      )}
                                    >
                                      <DetailedYouTubePlaylistItem
                                        youtubeItem={youtubeItem}
                                        playlistId={playlist.id}
                                        isEditMode={isEditMode && enableEdit}
                                        isSelected={selectedYouTubeItems.has(youtubeItem.id)}
                                        order={lockedOrder}
                                        index={actualIndex}
                                        totalItems={isYouTubeDragEnabled ? youtubeDisplayedEntries.length : filteredYouTube.length}
                                        onSelect={() => toggleItemSelection(youtubeItem.id, true)}
                                        onRemove={
                                          enableRemove
                                            ? () => {
                                                setItemToRemove({
                                                  itemId: youtubeItem.id,
                                                  title: youtubeItem.title,
                                                  isYouTube: true,
                                                });
                                              }
                                            : undefined
                                        }
                                        onItemClick={() => {
                                          if (isEditMode) {
                                            toggleItemSelection(youtubeItem.id, true);
                                          } else {
                                            window.open(`https://www.youtube.com/watch?v=${youtubeItem.videoId}`, "_blank");
                                          }
                                        }}
                                        isLgScreen={isLgScreen}
                                        sortField="listOrder"
                                        isPublic={playlist.visibility === "PUBLIC" || playlist.isPublic}
                                        enableOrdering={!isMixedPlaylist}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </YouTubeDragDropContext>
                  ) : (
                    <div className="space-y-4">
                      {paginatedYouTube.map((youtubeItem, index) => {
                        const actualIndex =
                          (youtubeCurrentPage - 1) * ITEMS_PER_PAGE + index;
                        return (
                          <DetailedYouTubePlaylistItem
                            key={youtubeItem.id}
                            youtubeItem={youtubeItem}
                            playlistId={playlist.id}
                            isEditMode={isEditMode && enableEdit}
                            isSelected={selectedYouTubeItems.has(youtubeItem.id)}
                            order={isMixedPlaylist ? undefined : (youtubeItem.order && youtubeItem.order > 0 ? youtubeItem.order : actualIndex + 1)}
                            index={actualIndex}
                            totalItems={filteredYouTube.length}
                            onSelect={() => toggleItemSelection(youtubeItem.id, true)}
                            onRemove={
                              enableRemove
                                ? () => {
                                    setItemToRemove({
                                      itemId: youtubeItem.id,
                                      title: youtubeItem.title,
                                      isYouTube: true,
                                    });
                                  }
                                : undefined
                            }
                            onItemClick={() => {
                              if (isEditMode) {
                                toggleItemSelection(youtubeItem.id, true);
                              } else {
                                window.open(`https://www.youtube.com/watch?v=${youtubeItem.videoId}`, "_blank");
                              }
                            }}
                            isLgScreen={isLgScreen}
                            sortField={isMixedPlaylist ? "createdAt" : "listOrder"}
                            isPublic={playlist.visibility === "PUBLIC" || playlist.isPublic}
                            enableOrdering={!isMixedPlaylist}
                          />
                        );
                      })}
                    </div>
                  )}
                  {youtubeTotalPages > 1 && !isYouTubeDragEnabled && (
                    <CollectionPagination
                      currentPage={youtubeCurrentPage}
                      totalPages={youtubeTotalPages}
                      onPageChange={setYoutubeCurrentPage}
                      pageNumbers={youtubePageNumbers}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Empty State */}
          {(!playlist.items || playlist.items?.length === 0) && (!playlist.youtubeItems || playlist.youtubeItems.length === 0) && (
            <div className="text-center py-12">
              <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
              <p className="text-muted-foreground mb-4">{emptyDescription}</p>
              {emptyAction}
            </div>
          )}
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      {enableRemove && (
        <Dialog
          open={!!itemToRemove}
          onOpenChange={(open) => !open && setItemToRemove(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove from Playlist</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove &quot;{itemToRemove?.title}
                &quot; from this playlist?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setItemToRemove(null)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemove}
                className="cursor-pointer"
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Remove Confirmation Dialog */}
      {enableRemove && (
        <Dialog
          open={isBulkRemoveDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsBulkRemoveDialogOpen(false);
              setBulkRemoveType(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Items from Playlist</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {bulkRemoveType === "youtube" ? selectedYouTubeItems.size : selectedItems.size} item{bulkRemoveType === "youtube" ? selectedYouTubeItems.size !== 1 : selectedItems.size !== 1 ? "s" : ""} from this playlist? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulkRemoveDialogOpen(false);
                  setBulkRemoveType(null);
                }}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmBulkRemove}
                className="cursor-pointer"
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Content Detail Modal */}
      {selectedItem && (
        <ContentDetailModal
          item={selectedItem.item}
          type={selectedItem.type}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Import Playlist Modal */}
      {enableExport && playlist && (
        <ImportPlaylistModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          playlistId={playlist.id}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* Edit Playlist Modal */}
      {isEditMode && enableEdit && playlist && (
        <CreatePlaylistModal
          isOpen={isEditPlaylistModalOpen}
          onClose={() => setIsEditPlaylistModalOpen(false)}
          playlist={playlist}
        />
      )}

      {/* Copy to Playlist Modal */}
      {isCopyModalOpen && playlist && (
        <CopyToPlaylistModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          selectedItems={Array.from(selectedItems)
            .map((id) => {
              const found = filteredAndSortedTMDB.find(
                ({ playlistItem }) => playlistItem.id === id
              );
              return found
                ? {
                    tmdbId: found.playlistItem.tmdbId,
                    mediaType: found.playlistItem.mediaType,
                    title: found.playlistItem.title,
                    posterPath: found.playlistItem.posterPath,
                    backdropPath: found.playlistItem.backdropPath,
                    releaseDate: found.playlistItem.releaseDate,
                    firstAirDate: found.playlistItem.firstAirDate,
                  }
                : null;
            })
            .filter(Boolean) as Array<{
            tmdbId: number;
            mediaType: "movie" | "tv";
            title: string;
            posterPath: string | null;
            backdropPath: string | null;
            releaseDate: string | null;
            firstAirDate: string | null;
          }>}
          currentPlaylistId={playlist.id}
          onSuccess={() => {
            setIsCopyModalOpen(false);
            setSelectedItems(new Set());
          }}
        />
      )}

      {/* Move to Playlist Modal */}
      {isMoveModalOpen && playlist && (
        <MoveToPlaylistModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          selectedItems={Array.from(selectedItems)
            .map((id) => {
              const found = filteredAndSortedTMDB.find(
                ({ playlistItem }) => playlistItem.id === id
              );
              return found
                ? {
                    id: found.playlistItem.id,
                    tmdbId: found.playlistItem.tmdbId,
                    mediaType: found.playlistItem.mediaType,
                    title: found.playlistItem.title,
                    posterPath: found.playlistItem.posterPath,
                    backdropPath: found.playlistItem.backdropPath,
                    releaseDate: found.playlistItem.releaseDate,
                    firstAirDate: found.playlistItem.firstAirDate,
                  }
                : null;
            })
            .filter(Boolean) as Array<{
            id: string;
            tmdbId: number;
            mediaType: "movie" | "tv";
            title: string;
            posterPath: string | null;
            backdropPath: string | null;
            releaseDate: string | null;
            firstAirDate: string | null;
          }>}
          currentPlaylistId={playlist.id}
          onRemove={onRemove}
          onSuccess={() => {
            setIsMoveModalOpen(false);
            setSelectedItems(new Set());
          }}
        />
      )}
    </>
  );
}

