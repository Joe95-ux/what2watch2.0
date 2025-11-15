"use client";

import { useState, useMemo, useEffect } from "react";
import { UserProfile } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import MovieCard from "@/components/browse/movie-card";
import { Playlist } from "@/hooks/use-playlists";
import { Users, UserCheck, List, Star, Heart, Edit, Image as ImageIcon, KeyRound, User as UserIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserFollowers, useUserFollowing, type User } from "@/hooks/use-follow";
import { useFavorites } from "@/hooks/use-favorites";
import { usePlaylists } from "@/hooks/use-playlists";
import ProfileLayout from "@/components/social/profile-layout";
import BannerGradientSelector, { BANNER_GRADIENTS } from "@/components/social/banner-gradient-selector";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/social/follow-button";
import { toast } from "sonner";

export default function DashboardProfileContent() {
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useCurrentUser();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"playlists" | "reviews" | "my-list" | "followers" | "following">("playlists");
  const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);
  const [selectedBannerGradient, setSelectedBannerGradient] = useState<string>("gradient-1");
  const [isClerkProfileOpen, setIsClerkProfileOpen] = useState(false);

  // Fetch user data (current user's own profile)
  const userId = currentUser?.id || "";

  const { data: followersData } = useUserFollowers(userId);
  const { data: followingData } = useUserFollowing(userId);
  const { data: playlists = [], isLoading: isLoadingPlaylists } = usePlaylists();
  const { data: favorites = [], isLoading: isLoadingFavorites } = useFavorites();

  const followers = followersData?.followers || [];
  const following = followingData?.following || [];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Pagination calculations
  const totalPages = useMemo(() => {
    if (activeTab === "playlists") {
      return Math.ceil(playlists.length / itemsPerPage);
    } else if (activeTab === "my-list") {
      return Math.ceil(favorites.length / itemsPerPage);
    }
    return 1;
  }, [playlists.length, favorites.length, activeTab, itemsPerPage]);

  const paginatedPlaylists = useMemo(() => {
    if (activeTab !== "playlists") return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return playlists.slice(startIndex, startIndex + itemsPerPage);
  }, [playlists, currentPage, itemsPerPage, activeTab]);

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

  // Get banner gradient
  const bannerGradient = useMemo(() => {
    const gradient = BANNER_GRADIENTS.find((g) => g.id === selectedBannerGradient);
    return gradient?.gradient || "#061E1C";
  }, [selectedBannerGradient]);

  if (isLoadingCurrentUser || !currentUser) {
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

  const displayName = currentUser.displayName || currentUser.username || "User";
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
        <DropdownMenuItem onClick={() => setIsClerkProfileOpen(true)} className="cursor-pointer">
          <UserIcon className="h-4 w-4 mr-2" />
          Edit Username
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setIsClerkProfileOpen(true)} className="cursor-pointer">
          <ImageIcon className="h-4 w-4 mr-2" />
          Edit Profile Picture
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setIsClerkProfileOpen(true)} className="cursor-pointer">
          <KeyRound className="h-4 w-4 mr-2" />
          Change Password
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Tabs component
  const tabs = isMobile ? (
    <div className="mb-6">
      <Select value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <SelectTrigger className="w-full">
          <SelectValue>
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
          <SelectItem value="my-list">
            <span className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              My List ({favorites.length})
            </span>
          </SelectItem>
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
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
      <TabsList className="justify-start overflow-x-auto">
        <TabsTrigger value="playlists" className="flex items-center gap-2">
          <List className="h-4 w-4" />
          Playlists ({playlists.length})
        </TabsTrigger>
        <TabsTrigger value="reviews" className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          Reviews
        </TabsTrigger>
        <TabsTrigger value="my-list" className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          My List ({favorites.length})
        </TabsTrigger>
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
      {activeTab === "playlists" && (
        <>
          {isLoadingPlaylists ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
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
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="cursor-pointer"
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
                    className="cursor-pointer"
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

      {activeTab === "my-list" && (
        <>
          {isLoadingFavorites ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
                        {paginatedFavorites.map(({ item, type }) => (
                  <div key={item.id} className="relative">
                    <MovieCard
                      item={item}
                      type={type}
                      variant="dashboard"
                    />
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="cursor-pointer"
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
                    className="cursor-pointer"
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
            <div className="space-y-4">
              {followers.map((follower: User) => (
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
                  <FollowButton userId={follower.id} size="sm" />
                </div>
              ))}
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
              <p className="text-muted-foreground">You aren&apos;t following anyone yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {following.map((user: User) => (
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
                  <FollowButton userId={user.id} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      <ProfileLayout
        bannerGradient={bannerGradient}
        displayName={displayName}
        username={currentUser.username || undefined}
        avatarUrl={currentUser.avatarUrl || undefined}
        initials={initials}
        followersCount={followers.length}
        followingCount={following.length}
        playlistsCount={playlists.length}
        actionButton={editButton}
        tabs={tabs}
        tabContent={tabContent}
        showBackButton={false}
      />

      {/* Edit Banner Dialog */}
      <Dialog open={isEditBannerOpen} onOpenChange={setIsEditBannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Banner</DialogTitle>
            <DialogDescription>
              Choose a gradient for your profile banner
            </DialogDescription>
          </DialogHeader>
          <BannerGradientSelector
            selectedGradient={selectedBannerGradient}
            onSelect={(gradientId) => {
              setSelectedBannerGradient(gradientId);
              // TODO: Save to database
              toast.success("Banner updated!");
              setIsEditBannerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Clerk User Profile - Opens in its own modal */}
      {isClerkProfileOpen && (
        <UserProfile />
      )}
    </>
  );
}

