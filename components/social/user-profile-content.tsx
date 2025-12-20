"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "./follow-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useUserFollowers, useUserFollowing, type User } from "@/hooks/use-follow";
import PlaylistCard from "@/components/browse/playlist-card";
import ListCard from "@/components/browse/list-card";
import MovieCard from "@/components/browse/movie-card";
import { MovieCardSkeleton } from "@/components/skeletons/movie-card-skeleton";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { Playlist } from "@/hooks/use-playlists";
import { List as ListType } from "@/hooks/use-lists";
import { Users, UserCheck, List, Star, Heart, ChevronLeft, ChevronRight, ClipboardList, Activity, ArrowLeft, MessagesSquare, ArrowRight } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFavorites } from "@/hooks/use-favorites";
import { useUserReviews } from "@/hooks/use-reviews";
import ReviewCard from "@/components/reviews/review-card";
import ProfileLayout from "./profile-layout";
import PublicProfileStickyNav from "./public-profile-sticky-nav";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import Link from "next/link";

interface UserProfileContentProps {
  userId?: string;
}

export default function UserProfileContent({ userId: propUserId }: UserProfileContentProps = {}) {
  const params = useParams();
  const router = useRouter();
  const userId = propUserId || (params?.userId as string) || "";
  const { data: currentUser } = useCurrentUser();
  const isOwnProfile = currentUser?.id === userId;
  const [activeTab, setActiveTab] = useState<"playlists" | "lists" | "reviews" | "my-list" | "discussions" | "followers" | "following">("lists");
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  
  // Fetch favorites for My List tab (only if viewing own profile)
  const { data: favorites = [], isLoading: isLoadingFavorites } = useFavorites();

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

  // Fetch user data
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user", userId, "profile"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/profile`);
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const { data: followersData, isLoading: isLoadingFollowers } = useUserFollowers(userId);
  const { data: followingData, isLoading: isLoadingFollowing } = useUserFollowing(userId);
  const { data: playlistsData, isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ["user", userId, "playlists"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/playlists`);
      if (!response.ok) {
        throw new Error("Failed to fetch playlists");
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const { data: listsData, isLoading: isLoadingLists } = useQuery({
    queryKey: ["user", userId, "lists"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/lists`);
      if (!response.ok) {
        throw new Error("Failed to fetch lists");
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const user = userData?.user;
  const playlists = useMemo(() => (playlistsData?.playlists || []) as Playlist[], [playlistsData?.playlists]);
  const lists = useMemo(() => (listsData?.lists || []) as ListType[], [listsData?.lists]);
  const followers = followersData?.followers || [];
  const following = followingData?.following || [];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Fetch reviews
  const { data: reviewsData, isLoading: isLoadingReviews } = useUserReviews(userId, {
    page: activeTab === "reviews" ? currentPage : 1,
    limit: itemsPerPage,
  });

  const reviews = reviewsData?.reviews || [];
  const reviewsTotal = reviewsData?.pagination?.total || 0;

  // Fetch forum stats
  const { data: forumStatsData, isLoading: isLoadingForumStats } = useQuery({
    queryKey: ["user", userId, "forum-stats"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/forum-stats`);
      if (!response.ok) {
        throw new Error("Failed to fetch forum stats");
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const forumStats = forumStatsData?.stats || { postCount: 0, replyCount: 0, totalReactions: 0 };
  const recentPosts = forumStatsData?.recentPosts || [];
  const recentReplies = forumStatsData?.recentReplies || [];

  // Pagination calculations
  const totalPages = useMemo(() => {
    if (activeTab === "playlists") {
      return Math.ceil(playlists.length / itemsPerPage);
    } else if (activeTab === "lists") {
      return Math.ceil(lists.length / itemsPerPage);
    } else if (activeTab === "my-list" && isOwnProfile) {
      return Math.ceil(favorites.length / itemsPerPage);
    } else if (activeTab === "reviews") {
      return reviewsData?.pagination?.totalPages || 1;
    }
    return 1;
  }, [playlists.length, lists.length, favorites.length, reviewsData?.pagination?.totalPages, activeTab, itemsPerPage, isOwnProfile]);

  const paginatedPlaylists = useMemo(() => {
    if (activeTab !== "playlists") return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return playlists.slice(startIndex, startIndex + itemsPerPage);
  }, [playlists, currentPage, itemsPerPage, activeTab]);

  const paginatedLists = useMemo(() => {
    if (activeTab !== "lists") return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return lists.slice(startIndex, startIndex + itemsPerPage);
  }, [lists, currentPage, itemsPerPage, activeTab]);

  // Convert favorites to TMDB format for My List tab
  const favoritesAsTMDB = useMemo(() => {
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
    if (activeTab !== "my-list") return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return favoritesAsTMDB.slice(startIndex, startIndex + itemsPerPage);
  }, [favoritesAsTMDB, currentPage, itemsPerPage, activeTab]);

  // Reset to page 1 when tab or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, playlists.length, lists.length, favorites.length, reviews.length]);

  // Reset to page 1 when tab or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, playlists.length, favorites.length]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background">
        {/* Banner Skeleton */}
        <div className="relative h-[200px] sm:h-[250px] overflow-hidden">
          <Skeleton className="w-full h-full" />
        </div>
        
        {/* Profile Info Skeleton */}
        <div className="container max-w-[70rem] mx-auto px-4 sm:px-6">
          {/* Avatar Skeleton */}
          <div className="relative -mt-16 sm:-mt-20 mb-4">
            <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />
          </div>

          {/* Profile Info Skeleton */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-4 w-full max-w-md mb-2" />
              <Skeleton className="h-4 w-3/4 max-w-sm mb-3" />
              {/* Stats Skeleton */}
              <div className="flex items-center gap-4 flex-wrap">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="flex-shrink-0">
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="sticky top-[65px] z-40 bg-transparent mb-6">
            <div className="flex items-center gap-8 overflow-x-auto">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-20 flex-shrink-0" />
              ))}
            </div>
          </div>

          {/* Tab Content Skeleton */}
          <div className="py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">User not found</h2>
          <p className="text-muted-foreground mb-4">The user you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push("/browse")} className="cursor-pointer">Back to Browse</Button>
        </div>
      </div>
    );
  }

  const displayName = user.displayName || user.username || "Unknown User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Action buttons
  const actionButtons = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={() => router.push(`/users/${userId}/activity`)}
        className="cursor-pointer"
      >
        <Activity className="h-4 w-4 mr-2" />
        Activity
      </Button>
      {!isOwnProfile && <FollowButton userId={userId} />}
    </div>
  );


  // Tab content
  const tabContent = (
    <>
      {activeTab === "lists" && (
        <>
          {isLoadingLists ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
              ))}
            </div>
          ) : lists.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No lists yet</h3>
              <p className="text-muted-foreground">This user hasn&apos;t created any lists.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                {paginatedLists.map((list: ListType) => (
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
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
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

      {activeTab === "playlists" && (
        <>
          {isLoadingPlaylists ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12">
              <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
              <p className="text-muted-foreground">This user hasn&apos;t created any playlists.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                {paginatedPlaylists.map((playlist: Playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    showLikeButton={!isOwnProfile}
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
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
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
              <p className="text-muted-foreground">This user hasn&apos;t written any reviews yet.</p>
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
            <>
              {/* Stats Skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg border bg-card">
                    <Skeleton className="h-5 w-16 mb-2" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                ))}
              </div>
              {/* Recent Posts Skeleton */}
              <div className="mb-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-lg border bg-card">
                      <Skeleton className="h-5 w-full mb-2" />
                      <div className="flex items-center gap-3 mt-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Recent Replies Skeleton */}
              <div>
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-lg border bg-card">
                      <Skeleton className="h-5 w-full mb-2" />
                      <Skeleton className="h-4 w-24 mt-2" />
                    </div>
                  ))}
                </div>
              </div>
            </>
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
                  <div className="space-y-4">
                    {recentPosts.map((post: any) => (
                      <Link
                        key={post.id}
                        href={`/forum/posts/${post.slug}`}
                        className="block pb-4 border-b hover:bg-muted/30 transition-colors"
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
                  <div className="space-y-4">
                    {recentReplies.map((reply: any) => (
                      <Link
                        key={reply.id}
                        href={`/forum/posts/${reply.postSlug}`}
                        className="block pb-4 border-b hover:bg-muted/30 transition-colors"
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
                  <p className="text-muted-foreground mb-4">This user hasn&apos;t participated in any discussions yet.</p>
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

      {activeTab === "my-list" && isOwnProfile && (
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
                          className="min-w-[40px] flex-shrink-0"
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
                          className="min-w-[40px] flex-shrink-0"
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

      {activeTab === "followers" && (
        <div>
          {isLoadingFollowers ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </div>
          ) : followers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No followers yet</h3>
              <p className="text-muted-foreground">This user doesn&apos;t have any followers.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {followers.map((follower: User) => {
                const isCurrentUser = currentUser?.id === follower.id;
                return (
                  <div key={follower.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={follower.avatarUrl || undefined} alt={follower.displayName || ""} />
                      <AvatarFallback>
                        {(follower.displayName || follower.username || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{follower.displayName || follower.username || "Unknown"}</p>
                      {follower.username && (
                        <p className="text-sm text-muted-foreground truncate">@{follower.username}</p>
                      )}
                    </div>
                    {isCurrentUser ? (
                      <span className="text-sm text-muted-foreground px-3 py-1.5">You</span>
                    ) : (
                      <FollowButton userId={follower.id} size="sm" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "following" && (
        <div>
          {isLoadingFollowing ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </div>
          ) : following.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Not following anyone</h3>
              <p className="text-muted-foreground">This user isn&apos;t following anyone yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {following.map((user: User) => {
                const isCurrentUser = currentUser?.id === user.id;
                return (
                  <div key={user.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || ""} />
                      <AvatarFallback>
                        {(user.displayName || user.username || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user.displayName || user.username || "Unknown"}</p>
                      {user.username && (
                        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                      )}
                    </div>
                    {isCurrentUser ? (
                      <span className="text-sm text-muted-foreground px-3 py-1.5">You</span>
                    ) : (
                      <FollowButton userId={user.id} size="sm" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Banner/Cover Section */}
        <div ref={heroRef} className="relative h-[200px] sm:h-[250px] overflow-hidden">
          <div 
            className="w-full h-full" 
            style={{ background: "#061E1C" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />
          
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="absolute top-4 left-4 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border-0 text-white cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Profile Info Section */}
        <div className="container max-w-[70rem] mx-auto px-4 sm:px-6">
          {/* Avatar */}
          <div className="relative -mt-16 sm:-mt-20 mb-4">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background">
              <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-3xl sm:text-4xl">{initials}</AvatarFallback>
            </Avatar>
          </div>

          {/* Profile Info and Action Button */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">{displayName}</h1>
              {user.username && (
                <p className="text-base sm:text-lg text-muted-foreground mb-3">@{user.username}</p>
              )}
              {user.bio && (
                <p className="text-sm sm:text-base text-foreground mb-3 whitespace-pre-wrap break-words">
                  {user.bio}
                </p>
              )}
              {/* Stats */}
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

            {/* Action Button */}
            {actionButtons && (
              <div className="flex-shrink-0">
                {actionButtons}
              </div>
            )}
          </div>

          {/* Sticky Nav */}
          <PublicProfileStickyNav
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
            isScrolled={isScrolled}
            counts={{
              playlists: playlists.length,
              lists: lists.length,
              favorites: favorites.length,
              followers: followers.length,
              following: following.length,
              discussions: forumStats.postCount + forumStats.replyCount,
            }}
            isOwnProfile={isOwnProfile}
            isLoading={isLoadingUser}
          />

          {/* Tab Content */}
          <div className="py-6">
            {tabContent}
          </div>
        </div>
      </div>

      {selectedItem && (
        <ContentDetailModal
          item={selectedItem.item}
          type={selectedItem.type}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}
