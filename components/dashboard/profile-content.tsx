"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useClerk } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PlaylistCard from "@/components/browse/playlist-card";
import ListCard from "@/components/browse/list-card";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { MovieCardSkeleton } from "@/components/skeletons/movie-card-skeleton";
import { Playlist } from "@/hooks/use-playlists";
import { Users, UserCheck, List, Star, Heart, Edit, Image as ImageIcon, KeyRound, User as UserIcon, ChevronLeft, ChevronRight, MessagesSquare, ArrowRight, UserCircle } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import { useUserFollowers, useUserFollowing, type User } from "@/hooks/use-follow";
import { useFavorites } from "@/hooks/use-favorites";
import { usePlaylists } from "@/hooks/use-playlists";
import { useLists } from "@/hooks/use-lists";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useUserReviews } from "@/hooks/use-reviews";
import ReviewCard from "@/components/reviews/review-card";
import ProfileStickyNav from "@/components/dashboard/profile-sticky-nav";
import BannerSelector from "@/components/social/banner-selector";
import { BANNER_GRADIENTS } from "@/components/social/banner-gradient-selector";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/social/follow-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { AvatarPickerDialog } from "@/components/avatar/avatar-picker-dialog";

interface DashboardProfileContentProps {
  userId: string;
}

export default function DashboardProfileContent({ userId: serverUserId }: DashboardProfileContentProps) {
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  const { openUserProfile, user: clerkUser } = useClerk();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"playlists" | "lists" | "watchlist" | "reviews" | "my-list" | "discussions" | "followers" | "following">("playlists");
  const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [selectedBannerGradient, setSelectedBannerGradient] = useState<string>("gradient-1");
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser?.bannerGradientId) {
      setSelectedBannerGradient(currentUser.bannerGradientId);
    }
  }, [currentUser?.bannerGradientId]);

  const userId = serverUserId || currentUser?.id || "";

  const { data: followersData } = useUserFollowers(userId || null);
  const { data: followingData } = useUserFollowing(userId || null);
  const { data: playlists = [], isLoading: isLoadingPlaylists } = usePlaylists();
  const { data: lists = [], isLoading: isLoadingLists } = useLists();
  const { data: watchlist = [], isLoading: isLoadingWatchlist } = useWatchlist();
  const { data: favorites = [], isLoading: isLoadingFavorites } = useFavorites();

  const followers = followersData?.followers || [];
  const following = followingData?.following || [];

  // Scroll detection for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setIsScrolled(rect.bottom < 100);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const itemsPerPage = 24;

  const { data: reviewsData, isLoading: isLoadingReviews } = useUserReviews(userId, {
    page: activeTab === "reviews" ? currentPage : 1,
    limit: itemsPerPage,
    enabled: !!userId && userId.trim() !== "",
  });

  const reviews = reviewsData?.reviews || [];
  const reviewsTotal = reviewsData?.pagination?.total || 0;

  // Fetch forum stats
  const { data: forumStatsData, isLoading: isLoadingForumStats } = useQuery({
    queryKey: ["user", userId, "forum-stats"],
    queryFn: async () => {
      if (!userId || userId.trim() === "") {
        throw new Error("User ID is required");
      }
      const response = await fetch(`/api/users/${userId}/forum-stats`);
      if (!response.ok) {
        if (response.status === 404) {
          return { stats: { postCount: 0, replyCount: 0, totalReactions: 0 }, recentPosts: [], recentReplies: [] };
        }
        throw new Error("Failed to fetch forum stats");
      }
      const data = await response.json();
      return data;
    },
    enabled: !!userId && userId.trim() !== "",
    retry: false,
  });

  const forumStats = forumStatsData?.stats || { postCount: 0, replyCount: 0, totalReactions: 0 };
  const recentPosts = forumStatsData?.recentPosts || [];
  const recentReplies = forumStatsData?.recentReplies || [];

  // Pagination calculations
  const totalPages = useMemo(() => {
    let pages = 1;
    if (activeTab === "playlists") {
      pages = Math.ceil(playlists.length / itemsPerPage);
    } else if (activeTab === "lists") {
      pages = Math.ceil(lists.length / itemsPerPage);
    } else if (activeTab === "watchlist") {
      pages = Math.ceil(watchlist.length / itemsPerPage);
    } else if (activeTab === "my-list") {
      pages = Math.ceil(favorites.length / itemsPerPage);
    } else if (activeTab === "followers") {
      pages = Math.ceil(followers.length / itemsPerPage);
    } else if (activeTab === "following") {
      pages = Math.ceil(following.length / itemsPerPage);
    } else if (activeTab === "reviews") {
      pages = reviewsData?.pagination?.totalPages || 1;
    }
    return Math.max(1, pages || 1);
  }, [playlists.length, lists.length, watchlist.length, favorites.length, followers.length, following.length, reviewsData?.pagination?.totalPages, activeTab, itemsPerPage]);

  const paginatedPlaylists = useMemo(() => {
    if (activeTab !== "playlists" || !Array.isArray(playlists)) return [];
    const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
    return playlists.slice(startIndex, startIndex + itemsPerPage);
  }, [playlists, currentPage, itemsPerPage, activeTab]);

  const paginatedLists = useMemo(() => {
    if (activeTab !== "lists" || !Array.isArray(lists)) return [];
    const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
    return lists.slice(startIndex, startIndex + itemsPerPage);
  }, [lists, currentPage, itemsPerPage, activeTab]);

  const paginatedWatchlist = useMemo(() => {
    if (activeTab !== "watchlist" || !Array.isArray(watchlist)) return [];
    const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
    return watchlist.slice(startIndex, startIndex + itemsPerPage);
  }, [watchlist, currentPage, itemsPerPage, activeTab]);

  const paginatedFollowers = useMemo(() => {
    if (activeTab !== "followers" || !Array.isArray(followers)) return [];
    const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
    return followers.slice(startIndex, startIndex + itemsPerPage);
  }, [followers, currentPage, itemsPerPage, activeTab]);

  const paginatedFollowing = useMemo(() => {
    if (activeTab !== "following" || !Array.isArray(following)) return [];
    const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
    return following.slice(startIndex, startIndex + itemsPerPage);
  }, [following, currentPage, itemsPerPage, activeTab]);

  // Convert watchlist to TMDB format
  const watchlistAsTMDB = useMemo(() => {
    if (!Array.isArray(watchlist)) return [];
    return watchlist.map((item) => {
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
        return { item: movie, type: "movie" as const };
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
        return { item: tv, type: "tv" as const };
      }
    });
  }, [watchlist]);

  const paginatedWatchlistAsTMDB = useMemo(() => {
    if (activeTab !== "watchlist" || !Array.isArray(watchlistAsTMDB)) return [];
    const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
    return watchlistAsTMDB.slice(startIndex, startIndex + itemsPerPage);
  }, [watchlistAsTMDB, currentPage, itemsPerPage, activeTab]);

  // Convert favorites to TMDB format for My List tab
  const favoritesAsTMDB = useMemo(() => {
    if (!Array.isArray(favorites)) return [];
    return favorites.map((fav) => {
      if (fav.mediaType === "movie") {
        const movie: TMDBMovie = {
          id: fav.tmdbId,
          title: fav.title,
          overview: "",
          poster_path: fav.posterPath,
          backdrop_path: fav.backdropPath,
          release_date: fav.releaseDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          adult: false,
          original_language: "",
          original_title: fav.title,
        };
        return { item: movie, type: "movie" as const };
      } else {
        const tv: TMDBSeries = {
          id: fav.tmdbId,
          name: fav.title,
          overview: "",
          poster_path: fav.posterPath,
          backdrop_path: fav.backdropPath,
          first_air_date: fav.firstAirDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          original_language: "",
          original_name: fav.title,
        };
        return { item: tv, type: "tv" as const };
      }
    });
  }, [favorites]);

  const paginatedFavorites = useMemo(() => {
    if (activeTab !== "my-list" || !Array.isArray(favoritesAsTMDB)) return [];
    const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
    return favoritesAsTMDB.slice(startIndex, startIndex + itemsPerPage);
  }, [favoritesAsTMDB, currentPage, itemsPerPage, activeTab]);

  // Reset to page 1 when tab or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, playlists.length, lists.length, watchlist.length, favorites.length, followers.length, following.length, reviews.length]);

  // Get banner - use bannerUrl if available, otherwise use gradient
  // MUST be called before any early returns to maintain hook order
  const bannerDisplay = useMemo(() => {
    try {
      if (!currentUser) {
        return { type: "gradient" as const, gradient: "#061E1C" };
      }
      if (currentUser.bannerUrl) {
        return { type: "image" as const, url: currentUser.bannerUrl };
      }
      const gradient = BANNER_GRADIENTS.find((g) => g.id === (currentUser.bannerGradientId || selectedBannerGradient));
      return { type: "gradient" as const, gradient: gradient?.gradient || "#061E1C" };
    } catch (error) {
      console.error("Error calculating bannerDisplay:", error);
      return { type: "gradient" as const, gradient: "#061E1C" };
    }
  }, [currentUser?.bannerUrl, currentUser?.bannerGradientId, currentUser, selectedBannerGradient]);

  // Generate page numbers with ellipsis for pagination
  // MUST be called before any early returns to maintain hook order
  const pageNumbers = useMemo(() => {
    try {
      const pages: (number | "ellipsis")[] = [];
      const safeTotalPages = Math.max(1, totalPages || 1);
      const safeCurrentPage = Math.max(1, Math.min(currentPage || 1, safeTotalPages));
      
      if (safeTotalPages <= 7) {
        for (let i = 1; i <= safeTotalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        if (safeCurrentPage > 3) {
          pages.push("ellipsis");
        }
        const start = Math.max(2, safeCurrentPage - 1);
        const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        if (safeCurrentPage < safeTotalPages - 2) {
          pages.push("ellipsis");
        }
        pages.push(safeTotalPages);
      }
      return pages;
    } catch (error) {
      console.error("Error calculating pageNumbers:", error);
      return [1];
    }
  }, [totalPages, currentPage]);

  // Defensive early return: show skeleton if critical data is loading or missing
  if (isLoadingCurrentUser || !currentUser || isLoadingPlaylists || isLoadingLists) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-[150px] max-w-[70rem] mx-0 sm:mx-auto sm:mt-[1rem] sm:mb-0 sm:rounded-[25px] overflow-hidden">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="container max-w-4xl mx-auto px-4 sm:px-6">
          <Skeleton className="h-32 w-32 rounded-full -mt-16 mb-4" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="mt-8">
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="group relative">
                  <div className="relative w-full h-[225px] rounded-lg overflow-hidden bg-muted border border-border">
                    {/* Grid of 3 Poster Skeletons */}
                    <div className="relative w-full h-[225px] grid grid-cols-3 gap-1">
                      {Array.from({ length: 3 }).map((_, posterIndex) => {
                        const borderRadiusClass = 
                          posterIndex === 0 ? "rounded-tl-lg rounded-bl-lg" :
                          posterIndex === 2 ? "rounded-tr-lg rounded-br-lg" :
                          "";
                        return (
                          <Skeleton
                            key={posterIndex}
                            className={`w-full h-full ${borderRadiusClass}`}
                          />
                        );
                      })}
                    </div>
                    {/* Dark Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-lg" />
                    {/* Icon and Text Skeleton - Bottom Left */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    {/* Item Count Badge Skeleton - Top Right */}
                    <div className="absolute top-2 right-2 z-10">
                      <Skeleton className="h-6 w-8 rounded-full" />
                    </div>
                  </div>
                  {/* Title Skeleton */}
                  <div className="mt-2">
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = currentUser?.username || currentUser?.displayName || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Edit button with dropdown
  const editButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setIsEditBannerOpen(true)} className="cursor-pointer">
          <ImageIcon className="h-4 w-4 mr-2" />
          Change Banner
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openUserProfile()} className="cursor-pointer">
          <UserIcon className="h-4 w-4 mr-2" />
          Edit Username
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            setIsAvatarEditorOpen(true);
          }} 
          className="cursor-pointer"
        >
          <UserCircle className="h-4 w-4 mr-2" />
          Edit Profile Picture
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openUserProfile()} className="cursor-pointer">
          <KeyRound className="h-4 w-4 mr-2" />
          Change Password
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Tab content
  const tabContent = (
    <>
      {activeTab === "playlists" && (
        <>
          {isLoadingPlaylists ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="group relative">
                  <div className="relative w-full h-[225px] rounded-lg overflow-hidden bg-muted border border-border">
                    {/* Grid of 3 Poster Skeletons */}
                    <div className="relative w-full h-[225px] grid grid-cols-3 gap-1">
                      {Array.from({ length: 3 }).map((_, posterIndex) => {
                        const borderRadiusClass = 
                          posterIndex === 0 ? "rounded-tl-lg rounded-bl-lg" :
                          posterIndex === 2 ? "rounded-tr-lg rounded-br-lg" :
                          "";
                        return (
                          <Skeleton
                            key={posterIndex}
                            className={`w-full h-full ${borderRadiusClass}`}
                          />
                        );
                      })}
                    </div>
                    {/* Dark Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-lg" />
                    {/* Icon and Text Skeleton - Bottom Left */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    {/* Item Count Badge Skeleton - Top Right */}
                    <div className="absolute top-2 right-2 z-10">
                      <Skeleton className="h-6 w-8 rounded-full" />
                    </div>
                  </div>
                  {/* Title Skeleton */}
                  <div className="mt-2">
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12">
              <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
              <p className="text-muted-foreground">You haven&apos;t created any playlists.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {paginatedPlaylists.map((playlist: Playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    showLikeButton={false}
                    variant="grid"
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 w-full overflow-auto px-2 py-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {pageNumbers.map((page, index) => {
                      if (page === "ellipsis") {
                        return (
                          <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                            ...
                          </span>
                        );
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px] flex-shrink-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-shrink-0"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "lists" && (
        <>
          {isLoadingLists ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="w-full h-[225px] rounded-lg" />
                  <Skeleton className="h-5 w-3/4 rounded" />
                </div>
              ))}
            </div>
          ) : lists.length === 0 ? (
            <div className="text-center py-12">
              <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No lists yet</h3>
              <p className="text-muted-foreground">You haven&apos;t created any lists.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {paginatedLists.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    variant="grid"
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 w-full overflow-auto px-2 py-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {pageNumbers.map((page, index) => {
                      if (page === "ellipsis") {
                        return (
                          <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                            ...
                          </span>
                        );
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px] flex-shrink-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-shrink-0"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "watchlist" && (
        <>
          {isLoadingWatchlist ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : paginatedWatchlistAsTMDB.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your watchlist is empty</h3>
              <p className="text-muted-foreground">Start adding movies and TV shows to your watchlist.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
                {paginatedWatchlistAsTMDB.map(({ item, type }) => (
                  <div key={item.id} className="relative">
                    <MovieCard
                      item={item}
                      type={type}
                      onCardClick={(clickedItem, clickedType) =>
                        setSelectedItem({
                          item: clickedItem,
                          type: clickedType,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 w-full overflow-auto px-2 py-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {pageNumbers.map((page, index) => {
                      if (page === "ellipsis") {
                        return (
                          <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                            ...
                          </span>
                        );
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px] flex-shrink-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-shrink-0"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "reviews" && (
        <>
          {isLoadingReviews ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
              <p className="text-muted-foreground">Start reviewing movies and TV shows to see them here.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} showFullContent />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (currentPage <= 4) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = currentPage - 3 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 7 && currentPage < totalPages - 3 && (
                      <>
                        <span className="px-2 text-muted-foreground">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="min-w-[40px]"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-shrink-0"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "discussions" && (
        <>
          {isLoadingForumStats ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <MessagesSquare className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">Posts</h3>
                  </div>
                  <p className="text-2xl font-bold">{forumStats.postCount}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <MessagesSquare className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">Replies</h3>
                  </div>
                  <p className="text-2xl font-bold">{forumStats.replyCount}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">Reactions</h3>
                  </div>
                  <p className="text-2xl font-bold">{forumStats.totalReactions}</p>
                </div>
              </div>

              {/* Recent Posts */}
              {recentPosts.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Recent Posts</h3>
                    <Link href="/forum">
                      <Button variant="ghost" size="sm" className="cursor-pointer">
                        View All
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {recentPosts.map((post: any) => (
                      <Link
                        key={post.id}
                        href={`/forum/${post.slug || post.id}`}
                        className="block p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{post.title}</h4>
                            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                              {post.category && (
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
                                >
                                  {post.category.name}
                                </span>
                              )}
                              <span>{post.replyCount} replies</span>
                              <span>{post.reactionCount} reactions</span>
                              <span>{post.views} views</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Replies */}
              {recentReplies.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Recent Replies</h3>
                    <Link href="/forum">
                      <Button variant="ghost" size="sm" className="cursor-pointer">
                        View All
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {recentReplies.map((reply: any) => (
                      <Link
                        key={reply.id}
                        href={`/forum/${reply.postSlug || reply.postId || ""}`}
                        className="block p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{reply.postTitle}</h4>
                            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                              <span>{reply.reactionCount} reactions</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {recentPosts.length === 0 && recentReplies.length === 0 && (
                <div className="text-center py-12">
                  <MessagesSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No forum activity yet</h3>
                  <p className="text-muted-foreground mb-4">Start participating in discussions to see your activity here.</p>
                  <Link href="/forum">
                    <Button className="cursor-pointer">
                      Browse Forum
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "my-list" && (
        <>
          {isLoadingFavorites ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : paginatedFavorites.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your list is empty</h3>
              <p className="text-muted-foreground">Start adding movies and TV shows to your list.</p>
            </div>
          ) : (
            <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
                        {paginatedFavorites.map(({ item, type }) => (
                  <div key={item.id} className="relative">
                    <MovieCard
                      item={item}
                      type={type}
                      onCardClick={(clickedItem, clickedType) =>
                        setSelectedItem({
                          item: clickedItem,
                          type: clickedType,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 w-full overflow-auto px-2 py-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {pageNumbers.map((page, index) => {
                      if (page === "ellipsis") {
                        return (
                          <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                            ...
                          </span>
                        );
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px] flex-shrink-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-shrink-0"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "followers" && (
        <div>
          {followers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No followers yet</h3>
              <p className="text-muted-foreground">You don&apos;t have any followers.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedFollowers.map((follower: User) => (
                <div key={follower.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={follower.avatarUrl || undefined} alt={follower.username || follower.displayName || ""} />
                    <AvatarFallback>
                      {(follower.username || follower.displayName || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{follower.username || follower.displayName || "Unknown"}</p>
                    {follower.username && (
                      <p className="text-sm text-muted-foreground truncate">@{follower.username}</p>
                    )}
                  </div>
                  <FollowButton userId={follower.id} size="sm" />
                </div>
              ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 w-full overflow-auto px-2 py-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {pageNumbers.map((page, index) => {
                      if (page === "ellipsis") {
                        return (
                          <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                            ...
                          </span>
                        );
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px] flex-shrink-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-shrink-0"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "following" && (
        <div>
          {following.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Not following anyone</h3>
              <p className="text-muted-foreground">You aren&apos;t following anyone yet.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedFollowing.map((user: User) => (
                <div key={user.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.username || user.displayName || ""} />
                    <AvatarFallback>
                      {(user.username || user.displayName || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user.username || user.displayName || "Unknown"}</p>
                    {user.username && (
                      <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                    )}
                  </div>
                  <FollowButton userId={user.id} size="sm" />
                </div>
              ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 w-full overflow-auto px-2 py-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {pageNumbers.map((page, index) => {
                      if (page === "ellipsis") {
                        return (
                          <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                            ...
                          </span>
                        );
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px] flex-shrink-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-shrink-0"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="min-h-screen sm:mx-4 bg-background">
        {/* Banner/Cover Section */}
        <div ref={heroRef} className="relative h-[150px] max-w-[70rem] mx-0 sm:mx-auto sm:mt-[1rem] sm:mb-0 sm:rounded-[25px] overflow-hidden">
          {bannerDisplay.type === "image" ? (
            <>
              <Image
                key={bannerDisplay.url}
                src={bannerDisplay.url}
                alt="Banner"
                fill
                className="object-cover"
                sizes="100vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />
            </>
          ) : (
            <>
              <div 
                className="w-full h-full" 
                style={{ background: bannerDisplay.gradient }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />
            </>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="container max-w-[70rem] mx-auto px-4 sm:px-6">
          <div className="relative -mt-16 sm:-mt-10 mb-4">
            <Avatar className="h-24 w-24 border-4 border-background">
              <AvatarImage src={contextAvatarUrl || currentUser?.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-3xl sm:text-4xl">{initials}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">{displayName}</h1>
              {currentUser?.username && (
                <p className="text-base sm:text-lg text-muted-foreground mb-3">@{currentUser.username}</p>
              )}
              {currentUser?.bio && (
                <p className="text-sm sm:text-base text-foreground mb-3 whitespace-pre-wrap break-words">
                  {currentUser.bio}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span>
                  <span className="font-semibold text-foreground">{followers.length}</span>{" "}
                  {followers.length === 1 ? "follower" : "followers"}
                </span>
                <span>
                  <span className="font-semibold text-foreground">{following.length}</span> following
                </span>
                <span>
                  <span className="font-semibold text-foreground">{playlists.length}</span>{" "}
                  {playlists.length === 1 ? "playlist" : "playlists"}
                </span>
                {lists.length > 0 && (
                  <span>
                    <span className="font-semibold text-foreground">{lists.length}</span>{" "}
                    {lists.length === 1 ? "list" : "lists"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              {editButton}
            </div>
          </div>

          {/* Sticky Nav */}
          <ProfileStickyNav
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
            isScrolled={isScrolled}
            counts={{
              playlists: playlists.length,
              lists: lists.length,
              watchlist: watchlist.length,
              favorites: favorites.length,
              followers: followers.length,
              following: following.length,
              reviews: reviewsTotal,
              discussions: forumStats.postCount + forumStats.replyCount,
            }}
          />

          {/* Tab Content */}
          <div className="py-6">
            {tabContent}
          </div>
        </div>
      </div>

      {/* Edit Banner Dialog */}
      <Dialog open={isEditBannerOpen} onOpenChange={setIsEditBannerOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>Change Banner</DialogTitle>
            <DialogDescription>
              Choose a gradient or upload your own banner image
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 min-h-0">
            <BannerSelector
              selectedGradient={currentUser?.bannerGradientId || selectedBannerGradient}
              selectedBannerUrl={currentUser?.bannerUrl}
              onSelect={async (data) => {
                try {
                  // Save to database
                  const response = await fetch("/api/user/banner", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      bannerUrl: data.bannerUrl,
                      bannerGradientId: data.gradientId,
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Failed to save banner");
                  }

                  // Update local state
                  if (data.gradientId) {
                    setSelectedBannerGradient(data.gradientId);
                  }

                  // Invalidate user queries to refresh banner
                  await queryClient.invalidateQueries({ queryKey: ["current-user", clerkUser?.id] });
                  await queryClient.refetchQueries({ queryKey: ["current-user", clerkUser?.id] });

                  toast.success("Banner updated!");
                  setIsEditBannerOpen(false);
                } catch (error) {
                  console.error("Error saving banner:", error);
                  toast.error("Error", {
                    description: error instanceof Error ? error.message : "Failed to save banner.",
                  });
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {selectedItem && (
        <ContentDetailModal
          item={selectedItem.item}
          type={selectedItem.type}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      <AvatarPickerDialog
        isOpen={isAvatarEditorOpen}
        onClose={() => setIsAvatarEditorOpen(false)}
        currentAvatarUrl={currentUser?.avatarUrl}
      />
      
    </>
  );
}

