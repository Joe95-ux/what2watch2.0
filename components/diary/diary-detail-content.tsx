"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useViewingLogs, useUpdateViewingLog, useDeleteViewingLog, useLogViewing, type ViewingLog } from "@/hooks/use-viewing-logs";
import { useToggleFavorite, useAddFavorite, useRemoveFavorite } from "@/hooks/use-favorites";
import { useViewingLogComments, useCreateComment, useDeleteComment, type ViewingLogComment } from "@/hooks/use-viewing-log-comments";
import { useMovieDetails, useTVDetails, useContentVideos } from "@/hooks/use-content-details";
import { getPosterUrl, getBackdropUrl, getYouTubeEmbedUrl, type TMDBVideo, type TMDBMovie, type TMDBSeries } from "@/lib/tmdb";
import { format } from "date-fns";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Heart, Star, CalendarIcon, Play, Edit, Trash2, Share2, Plus, 
  MessageSquare, Film, Tv, Clock, ArrowLeft, BookOpen, Check, Reply, MoreVertical, Filter, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AddToPlaylistDropdown from "@/components/playlists/add-to-playlist-dropdown";
import TrailerModal from "@/components/browse/trailer-modal";

interface DiaryDetailContentProps {
  log: ViewingLog;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export default function DiaryDetailContent({ log: initialLog, user }: DiaryDetailContentProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: currentUser } = useCurrentUser();
  const isOwner = currentUser?.id === user.id;
  
  const [log, setLog] = useState(initialLog);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLogAgainDialogOpen, setIsLogAgainDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TMDBVideo | null>(null);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [commentFilter, setCommentFilter] = useState("newest");
  const addToPlaylistButtonRef = useRef<HTMLButtonElement>(null);
  
  const updateLog = useUpdateViewingLog();
  const deleteLog = useDeleteViewingLog();
  const logViewing = useLogViewing();
  const toggleFavorite = useToggleFavorite();
  const isLiked = toggleFavorite.isFavorite(log.tmdbId, log.mediaType);
  const { data: comments = [], isLoading: commentsLoading } = useViewingLogComments(log.id, commentFilter);
  const deleteComment = useDeleteComment();
  
  // Fetch movie/TV details
  const { data: movieDetails } = useMovieDetails(log.mediaType === "movie" ? log.tmdbId : null);
  const { data: tvDetails } = useTVDetails(log.mediaType === "tv" ? log.tmdbId : null);
  const { data: videosData } = useContentVideos(log.mediaType, log.tmdbId);
  
  const details = log.mediaType === "movie" ? movieDetails : tvDetails;
  const title = log.title;
  const posterPath = log.posterPath;
  const backdropPath = log.backdropPath || log.posterPath;
  
  // Find trailer
  const trailer: TMDBVideo | null =
    videosData?.results?.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.official && v.site === "YouTube"
    ) ||
    videosData?.results?.find(
      (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
    ) ||
    null;
  
  const allVideos = videosData?.results || [];
  
  // Create mock item for AddToPlaylistDropdown and toggleFavorite
  const mockMovieItem: TMDBMovie = {
    id: log.tmdbId,
    title: log.title,
    poster_path: log.posterPath,
    backdrop_path: log.backdropPath,
    release_date: log.releaseDate || "",
    overview: details?.overview || "",
    vote_average: 0,
    vote_count: 0,
    genre_ids: [],
    popularity: 0,
    adult: false,
    original_language: "en",
    original_title: log.title,
  };
  
  const mockTVItem: TMDBSeries = {
    id: log.tmdbId,
    name: log.title,
    poster_path: log.posterPath,
    backdrop_path: log.backdropPath,
    first_air_date: log.firstAirDate || "",
    overview: details?.overview || "",
    vote_average: 0,
    vote_count: 0,
    genre_ids: [],
    popularity: 0,
    original_language: "en",
    original_name: log.title,
  };
  
  const mockItem = log.mediaType === "movie" ? mockMovieItem : mockTVItem;
  
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };
  
  const handleDelete = async () => {
    try {
      await deleteLog.mutateAsync(log.id);
      toast.success("Review deleted");
      router.push(`/${user.username}`);
    } catch {
      toast.error("Failed to delete review");
    }
  };
  
  const watchedDate = new Date(log.watchedAt);
  const releaseYear = log.releaseDate 
    ? new Date(log.releaseDate).getFullYear() 
    : log.firstAirDate 
    ? new Date(log.firstAirDate).getFullYear() 
    : null;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative w-full h-[60vh] min-h-[400px] overflow-hidden -mt-[65px]">
        {backdropPath ? (
          <>
            <Image
              src={getBackdropUrl(backdropPath, "w1280")}
              alt={title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
        
        <div className="absolute inset-0 flex items-end z-10">
          <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
            <div className="max-w-7xl mx-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <div className="flex flex-col md:flex-row gap-6">
                {posterPath && (
                  <div className="relative w-32 h-48 md:w-40 md:h-60 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={getPosterUrl(posterPath, "w500")}
                      alt={title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    {releaseYear && (
                      <span className="text-muted-foreground">{releaseYear}</span>
                    )}
                    <span className="text-muted-foreground capitalize">{log.mediaType}</span>
                    {trailer && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedVideo(trailer);
                          setIsTrailerModalOpen(true);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Watch Trailer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Review by [username] Section */}
            <div className="sm:bg-card sm:border sm:rounded-lg p-0 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                {user.avatarUrl ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden">
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName || user.username}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {(user.displayName || user.username)[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold">Review by {user.displayName || user.username}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              
              {/* Movie Title */}
              <h2 className="text-2xl font-bold mb-4">{title}</h2>
              
              {/* Rating */}
              {log.rating && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-5 w-5",
                          star <= log.rating!
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{log.rating}/5</span>
                </div>
              )}
              
              {/* Date Watched */}
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>Watched on {format(watchedDate, "MMMM d, yyyy")}</span>
              </div>
              
              {/* Notes/Review */}
              {log.notes && (
                <div className="mb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{log.notes}</p>
                </div>
              )}
              
              {/* Review Likes - placeholder for future implementation */}
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span>No likes yet</span>
              </div>
              
              {/* Actions */}
              {isOwner && (
                <div className="flex items-center gap-2 pt-4 border-t">
                  {/* Primary button - always visible */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="flex-1 sm:flex-initial"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  {/* Mobile dropdown for additional actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="sm:hidden"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsLogAgainDialogOpen(true)}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Log Again
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsDeleteDialogOpen(true)}
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Desktop buttons - hidden on mobile */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLogAgainDialogOpen(true)}
                    className="hidden sm:flex"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Log Again
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive hover:text-destructive hidden sm:flex"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
              
              {/* Actions for all users */}
              <div className="flex items-center gap-2 pt-4 border-t mt-4">
                {/* Primary button - always visible */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (log.mediaType === "movie") {
                      await toggleFavorite.toggle(mockMovieItem, "movie");
                    } else {
                      await toggleFavorite.toggle(mockTVItem, "tv");
                    }
                  }}
                  className={cn(
                    "flex-1 sm:flex-initial",
                    isLiked && "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                  )}
                >
                  <Heart 
                    className={cn(
                      "h-4 w-4 mr-2",
                      isLiked ? "text-red-500 fill-red-500" : "text-muted-foreground"
                    )} 
                  />
                  {isLiked ? "Liked" : "Like"}
                </Button>
                
                {/* Mobile dropdown for additional actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="sm:hidden"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        // Trigger the AddToPlaylistDropdown button click
                        setTimeout(() => {
                          addToPlaylistButtonRef.current?.click();
                        }, 0);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Playlist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* AddToPlaylistDropdown - hidden on mobile, visible on desktop */}
                <div className="hidden sm:block">
                  <AddToPlaylistDropdown
                    item={mockItem}
                    type={log.mediaType}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Playlist
                      </Button>
                    }
                  />
                </div>
                
                {/* Mobile AddToPlaylistDropdown - hidden but clickable via ref */}
                <div className="sm:hidden absolute opacity-0 pointer-events-none">
                  <AddToPlaylistDropdown
                    item={mockItem}
                    type={log.mediaType}
                    trigger={
                      <Button
                        ref={addToPlaylistButtonRef}
                        variant="outline"
                        size="sm"
                        className="invisible"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Playlist
                      </Button>
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="hidden sm:flex"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
            
            {/* Comments Section */}
            <CommentsSection
              logId={log.id}
              comments={comments}
              isLoading={commentsLoading}
              filter={commentFilter}
              onFilterChange={setCommentFilter}
              currentUser={currentUser}
              onDeleteComment={(commentId: string) => {
                deleteComment.mutate({ logId: log.id, commentId });
              }}
            />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Watch Providers - Placeholder */}
            <div className="sm:bg-card sm:border sm:rounded-lg p-0 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Where to Watch</h3>
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">Watch provider information coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <EditLogDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          log={log}
          onUpdate={(updatedLog) => {
            setLog(updatedLog);
            setIsEditDialogOpen(false);
          }}
          isPending={updateLog.isPending}
        />
      )}
      
      {/* Log Again Dialog */}
      {isLogAgainDialogOpen && (
        <LogAgainDialog
          isOpen={isLogAgainDialogOpen}
          onClose={() => setIsLogAgainDialogOpen(false)}
          log={log}
          onSuccess={() => {
            setIsLogAgainDialogOpen(false);
            router.refresh();
          }}
          isPending={logViewing.isPending}
        />
      )}
      
      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLog.isPending}>
              {deleteLog.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Trailer Modal */}
      {selectedVideo && (
        <TrailerModal
          video={selectedVideo}
          videos={allVideos}
          isOpen={isTrailerModalOpen}
          onClose={() => {
            setIsTrailerModalOpen(false);
            setSelectedVideo(null);
          }}
          title={title}
        />
      )}
    </div>
  );
}

// Edit Log Dialog Component
interface EditLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  log: ViewingLog;
  onUpdate: (log: ViewingLog) => void;
  isPending: boolean;
}

function EditLogDialog({ isOpen, onClose, log, onUpdate, isPending }: EditLogDialogProps) {
  const [watchedDate, setWatchedDate] = useState<Date>(new Date(log.watchedAt));
  const [notes, setNotes] = useState(log.notes || "");
  const [rating, setRating] = useState<number | null>(log.rating || null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const updateLog = useUpdateViewingLog();
  const toggleFavorite = useToggleFavorite();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const isLiked = toggleFavorite.isFavorite(log.tmdbId, log.mediaType);

  useEffect(() => {
    if (isOpen && log) {
      setWatchedDate(new Date(log.watchedAt));
      setNotes(log.notes || "");
      setRating(log.rating || null);
    }
  }, [isOpen, log]);

  const handleLikeToggle = async () => {
    if (isLiked) {
      await removeFavorite.mutateAsync({ tmdbId: log.tmdbId, mediaType: log.mediaType });
    } else {
      await addFavorite.mutateAsync({
        tmdbId: log.tmdbId,
        mediaType: log.mediaType,
        title: log.title,
        posterPath: log.posterPath ?? undefined,
        backdropPath: log.backdropPath ?? undefined,
        releaseDate: log.releaseDate ?? undefined,
        firstAirDate: log.firstAirDate ?? undefined,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      await updateLog.mutateAsync({
        logId: log.id,
        watchedAt: watchedDate.toISOString(),
        notes: notes.trim() || null,
        rating: rating || null,
      });
      onUpdate({
        ...log,
        watchedAt: watchedDate.toISOString(),
        notes: notes.trim() || null,
        rating: rating || null,
      });
      toast.success("Review updated");
    } catch {
      toast.error("Failed to update review");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Review</DialogTitle>
          <DialogDescription>
            Update your review for &quot;{log.title}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Like Button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-2",
                isLiked && "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
              )}
              onClick={handleLikeToggle}
            >
              <Heart 
                className={cn(
                  "h-4 w-4",
                  isLiked 
                    ? "text-red-500 fill-red-500" 
                    : "text-muted-foreground"
                )} 
              />
              <span className="text-sm">
                {isLiked ? "Liked" : "Like"}
              </span>
            </Button>
          </div>
          
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-sm">Rating (Optional)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={cn(
                      "h-5 w-5 transition-colors",
                      rating && star <= rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
              {rating && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating}/5
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="watched-date">Date Watched</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedDate ? format(watchedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchedDate}
                  onSelect={(date) => {
                    if (date) {
                      setWatchedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add your thoughts, rating, or any notes about this viewing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Log Again Dialog Component
interface LogAgainDialogProps {
  isOpen: boolean;
  onClose: () => void;
  log: ViewingLog;
  onSuccess: () => void;
  isPending: boolean;
}

function LogAgainDialog({ isOpen, onClose, log, onSuccess, isPending }: LogAgainDialogProps) {
  const [watchedDate, setWatchedDate] = useState<Date>(new Date());
  const [review, setReview] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [hasWatched, setHasWatched] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const logViewing = useLogViewing();
  const toggleFavorite = useToggleFavorite();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const isLiked = toggleFavorite.isFavorite(log.tmdbId, log.mediaType);

  useEffect(() => {
    if (isOpen) {
      setWatchedDate(new Date());
      setReview("");
      setRating(null);
      setTags("");
      setHasWatched(true);
    }
  }, [isOpen]);

  const handleLikeToggle = async () => {
    if (isLiked) {
      await removeFavorite.mutateAsync({ tmdbId: log.tmdbId, mediaType: log.mediaType });
    } else {
      await addFavorite.mutateAsync({
        tmdbId: log.tmdbId,
        mediaType: log.mediaType,
        title: log.title,
        posterPath: log.posterPath ?? undefined,
        backdropPath: log.backdropPath ?? undefined,
        releaseDate: log.releaseDate ?? undefined,
        firstAirDate: log.firstAirDate ?? undefined,
      });
    }
  };

  const handleSubmit = async () => {
    if (logViewing.isPending) return;
    
    try {
      await logViewing.mutateAsync({
        tmdbId: log.tmdbId,
        mediaType: log.mediaType,
        title: log.title,
        posterPath: log.posterPath || null,
        backdropPath: log.backdropPath || null,
        releaseDate: log.releaseDate || null,
        firstAirDate: log.firstAirDate || null,
        watchedAt: watchedDate.toISOString(),
        notes: review.trim() || null,
        rating: rating || null,
      });
      
      toast.success("Film logged to your diary!");
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to log film";
      toast.error(errorMessage.includes("already") ? errorMessage : "Failed to log film. Please try again.");
    }
  };

  const releaseYear = log.releaseDate 
    ? new Date(log.releaseDate).getFullYear() 
    : log.firstAirDate 
    ? new Date(log.firstAirDate).getFullYear() 
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Again</DialogTitle>
          <DialogDescription>
            Log another viewing of &quot;{log.title}&quot;{releaseYear ? ` (${releaseYear})` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Movie Name and Release Year */}
          <div className="pb-2 border-b">
            <h3 className="font-semibold text-lg">{log.title}</h3>
            {releaseYear && (
              <p className="text-sm text-muted-foreground">{releaseYear}</p>
            )}
          </div>

          {/* I have watched this checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has-watched"
              checked={hasWatched}
              onCheckedChange={(checked) => setHasWatched(checked === true)}
            />
            <Label htmlFor="has-watched" className="text-sm font-normal cursor-pointer">
              I have watched this
            </Label>
          </div>

          {/* Like Button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-2",
                isLiked && "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
              )}
              onClick={handleLikeToggle}
            >
              <Heart 
                className={cn(
                  "h-4 w-4",
                  isLiked 
                    ? "text-red-500 fill-red-500" 
                    : "text-muted-foreground"
                )} 
              />
              <span className="text-sm">
                {isLiked ? "Liked" : "Like"}
              </span>
            </Button>
          </div>
          
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-sm">Rating (Optional)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={cn(
                      "h-5 w-5 transition-colors",
                      rating && star <= rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
              {rating && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating}/5
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="watched-date">Date Watched</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedDate ? format(watchedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchedDate}
                  onSelect={(date) => {
                    if (date) {
                      setWatchedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Review Textarea */}
          <div className="space-y-2">
            <Label htmlFor="review">Review (Optional)</Label>
            <Textarea
              id="review"
              placeholder="Add your thoughts, rating, or any notes about this viewing..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              placeholder="Add tags separated by commas (e.g., favorite, rewatch, classic)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple tags with commas
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !hasWatched}>
            {isPending ? "Logging..." : "Log Film"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Comments Section Component
interface CommentsSectionProps {
  logId: string;
  comments: ViewingLogComment[];
  isLoading: boolean;
  filter: string;
  onFilterChange: (filter: string) => void;
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  onDeleteComment: (commentId: string) => void;
}

function CommentsSection({
  logId,
  comments,
  isLoading,
  filter,
  onFilterChange,
  currentUser,
  onDeleteComment,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const createComment = useCreateComment();

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    try {
      await createComment.mutateAsync({
        logId,
        content: newComment.trim(),
      });
      setNewComment("");
      toast.success("Comment posted");
    } catch (error) {
      toast.error("Failed to post comment");
    }
  };

  const handlePostReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !currentUser) return;

    try {
      await createComment.mutateAsync({
        logId,
        content: replyContent.trim(),
        parentCommentId,
      });
      setReplyContent("");
      setReplyingTo(null);
      toast.success("Reply posted");
    } catch (error) {
      toast.error("Failed to post reply");
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return format(commentDate, "MMM d, yyyy");
  };

  return (
    <div className="sm:bg-card sm:border sm:rounded-lg p-0 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="most-liked">Most Liked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {/* Comment input - only for logged in users */}
        {currentUser && (
          <div className="flex items-start gap-3 pb-4 border-b">
            {currentUser.avatarUrl ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName || currentUser.username}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium">
                  {(currentUser.displayName || currentUser.username)[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment..."
                rows={3}
                className="resize-none"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button
                size="sm"
                className="mt-2"
                onClick={handlePostComment}
                disabled={!newComment.trim() || createComment.isPending}
              >
                {createComment.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        )}

        {/* Comments list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                logId={logId}
                currentUser={currentUser}
                onDelete={onDeleteComment}
                onReply={(commentId) => {
                  setReplyingTo(commentId);
                  setReplyContent("");
                }}
                replyingTo={replyingTo}
                replyContent={replyContent}
                onReplyContentChange={setReplyContent}
                onPostReply={handlePostReply}
                onCancelReply={() => {
                  setReplyingTo(null);
                  setReplyContent("");
                }}
                formatTimeAgo={formatTimeAgo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Comment Item Component with nested replies
interface CommentItemProps {
  comment: ViewingLogComment;
  logId: string;
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  onDelete: (commentId: string) => void;
  onReply: (commentId: string) => void;
  replyingTo: string | null;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  onPostReply: (parentCommentId: string) => void;
  onCancelReply: () => void;
  formatTimeAgo: (date: string) => string;
}

function CommentItem({
  comment,
  logId,
  currentUser,
  onDelete,
  onReply,
  replyingTo,
  replyContent,
  onReplyContentChange,
  onPostReply,
  onCancelReply,
  formatTimeAgo,
}: CommentItemProps) {
  const isOwner = currentUser?.id === comment.userId;
  const isReplying = replyingTo === comment.id;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {/* Avatar */}
        {comment.user.avatarUrl ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={comment.user.avatarUrl}
              alt={comment.user.displayName || comment.user.username}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium">
              {(comment.user.displayName || comment.user.username)[0].toUpperCase()}
            </span>
          </div>
        )}

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className="font-semibold text-sm">
                {comment.user.displayName || comment.user.username}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {formatTimeAgo(comment.createdAt)}
              </span>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this comment?")) {
                        onDelete(comment.id);
                      }
                    }}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {currentUser && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Reply className="h-3.5 w-3.5" />
                Reply
              </button>
            )}
            {comment.likes > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {comment.likes}
              </span>
            )}
          </div>

          {/* Reply input */}
          {isReplying && currentUser && (
            <div className="mt-3 ml-4 pl-4 border-l-2 border-border">
              <div className="flex gap-2">
                {currentUser.avatarUrl ? (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={currentUser.avatarUrl}
                      alt={currentUser.displayName || currentUser.username}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium">
                      {(currentUser.displayName || currentUser.username)[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <Textarea
                    placeholder={`Reply to ${comment.user.displayName || comment.user.username}...`}
                    rows={2}
                    className="resize-none text-sm"
                    value={replyContent}
                    onChange={(e) => onReplyContentChange(e.target.value)}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onCancelReply}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onPostReply(comment.id)}
                      disabled={!replyContent.trim()}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-full bg-border" />
              </div>

              {/* Reply content */}
              <div className="flex-1">
                <CommentItem
                  comment={reply}
                  logId={logId}
                  currentUser={currentUser}
                  onDelete={onDelete}
                  onReply={onReply}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  onReplyContentChange={onReplyContentChange}
                  onPostReply={onPostReply}
                  onCancelReply={onCancelReply}
                  formatTimeAgo={formatTimeAgo}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

