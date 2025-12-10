"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "./follow-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useUserFollowers, useUserFollowing, type User } from "@/hooks/use-follow";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PlaylistCard from "@/components/browse/playlist-card";
import ListCard from "@/components/browse/list-card";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { Playlist } from "@/hooks/use-playlists";
import { List as ListType } from "@/hooks/use-lists";
import { Users, UserCheck, List, Star, Heart, ChevronLeft, ChevronRight, ClipboardList, Activity } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFavorites } from "@/hooks/use-favorites";
import ProfileLayout from "./profile-layout";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

interface UserProfileContentProps {
  userId?: string;
}

export default function UserProfileContent({ userId: propUserId }: UserProfileContentProps = {}) {
  const params = useParams();
  const router = useRouter();
  const userId = propUserId || (params?.userId as string) || "";
  const { data: currentUser } = useCurrentUser();
  const isOwnProfile = currentUser?.id === userId;
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"playlists" | "lists" | "reviews" | "my-list" | "followers" | "following">("lists");
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  
  // Fetch favorites for My List tab (only if viewing own profile)
  const { data: favorites = [], isLoading: isLoadingFavorites } = useFavorites();

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

  const { data: followersData } = useUserFollowers(userId);
  const { data: followingData } = useUserFollowing(userId);
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

  // Pagination calculations
  const totalPages = useMemo(() => {
    if (activeTab === "playlists") {
      return Math.ceil(playlists.length / itemsPerPage);
    } else if (activeTab === "lists") {
      return Math.ceil(lists.length / itemsPerPage);
    } else if (activeTab === "my-list" && isOwnProfile) {
      return Math.ceil(favorites.length / itemsPerPage);
    }
    return 1;
  }, [playlists.length, lists.length, favorites.length, activeTab, itemsPerPage, isOwnProfile]);

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
  }, [activeTab, playlists.length, favorites.length]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-[200px] sm:h-[250px] overflow-hidden">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="container max-w-4xl mx-auto px-4 sm:px-6">
          <Skeleton className="h-32 w-32 rounded-full -mt-16 mb-4" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-4" />
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

  // Tabs component
  const tabs = isMobile ? (
    <div className="mb-6">
      <Select value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {activeTab === "lists" && (
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Lists ({lists.length})
              </span>
            )}
            {activeTab === "playlists" && (
              <span className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Playlists ({playlists.length})
              </span>
            )}
            {activeTab === "reviews" && (
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Reviews
              </span>
            )}
            {activeTab === "my-list" && (
              <span className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                My List ({favorites.length})
              </span>
            )}
            {activeTab === "followers" && (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Followers ({followers.length})
              </span>
            )}
            {activeTab === "following" && (
              <span className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Following ({following.length})
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="lists">
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Lists ({lists.length})
            </span>
          </SelectItem>
          <SelectItem value="playlists">
            <span className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Playlists ({playlists.length})
            </span>
          </SelectItem>
          <SelectItem value="reviews">
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reviews
            </span>
          </SelectItem>
          {isOwnProfile && (
            <SelectItem value="my-list">
              <span className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                My List ({favorites.length})
              </span>
            </SelectItem>
          )}
          <SelectItem value="followers">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Followers ({followers.length})
            </span>
          </SelectItem>
          <SelectItem value="following">
            <span className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Following ({following.length})
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  ) : (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="lists" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Lists ({lists.length})
        </TabsTrigger>
        <TabsTrigger value="playlists" className="flex items-center gap-2">
          <List className="h-4 w-4" />
          Playlists ({playlists.length})
        </TabsTrigger>
        <TabsTrigger value="reviews" className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          Reviews
        </TabsTrigger>
        {isOwnProfile && (
          <TabsTrigger value="my-list" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            My List ({favorites.length})
          </TabsTrigger>
        )}
        <TabsTrigger value="followers" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Followers ({followers.length})
        </TabsTrigger>
        <TabsTrigger value="following" className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Following ({following.length})
        </TabsTrigger>
      </TabsList>
    </Tabs>
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
        <div className="text-center py-12">
          <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Reviews coming soon</h3>
          <p className="text-muted-foreground">This feature is under development.</p>
        </div>
      )}

      {activeTab === "my-list" && isOwnProfile && (
        <>
          {isLoadingFavorites ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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

      {activeTab === "followers" && (
        <div>
          {followers.length === 0 ? (
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
          {following.length === 0 ? (
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
      <ProfileLayout
        bannerGradient="#061E1C"
        displayName={displayName}
        username={user.username || undefined}
        bio={user.bio || undefined}
        avatarUrl={user.avatarUrl || undefined}
        initials={initials}
        followersCount={followers.length}
        followingCount={following.length}
        playlistsCount={playlists.length}
        listsCount={lists.length}
        actionButton={actionButtons}
        tabs={tabs}
        tabContent={tabContent}
        showBackButton={true}
        onBack={() => router.back()}
      />

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
