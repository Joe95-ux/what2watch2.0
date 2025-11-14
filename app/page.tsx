'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  ArrowRight,
  Sparkles,
  Users,
  Clapperboard,
  Compass,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import Navbar from "@/components/navbar/navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TrailerModal from "@/components/browse/trailer-modal";
import AddToPlaylistDropdown from "@/components/playlists/add-to-playlist-dropdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  useTrendingMovies,
  useTrendingTV,
} from "@/hooks/use-movies";
import { usePublicPlaylists } from "@/hooks/use-playlists";
import PlaylistRow from "@/components/browse/playlist-row";
import {
  getBackdropUrl,
  getPosterUrl,
  TMDBMovie,
  TMDBSeries,
  TMDBVideo,
} from "@/lib/tmdb";
import { cn } from "@/lib/utils";

type HeroSlide = {
  id: number;
  type: "movie" | "tv";
  title: string;
  overview: string;
  backdrop: string | null;
  poster: string | null;
  rating: number;
  voteCount: number;
  year: string | null;
  popularity: number;
};

type TrailerState = {
  videos: TMDBVideo[];
  trailer: TMDBVideo | null;
  loading: boolean;
  error?: string;
};

function PublicPlaylistsCarousel() {
  const { data: playlists = [], isLoading, isError, error } = usePublicPlaylists(20);

  if (isLoading) {
    return (
      <div className="mb-12">
        <div className="relative">
          <div className="overflow-x-hidden">
            <div className="flex gap-3 px-4 sm:px-6 lg:px-8">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex-shrink-0">
                  <Skeleton className="w-[180px] sm:w-[200px] aspect-[3/4] rounded-lg !bg-gray-200 dark:!bg-accent" />
                  {/* Mobile title skeleton */}
                  <div className="mt-2 md:hidden">
                    <Skeleton className="h-4 w-32 mb-1 !bg-gray-200 dark:!bg-accent" />
                    <Skeleton className="h-3 w-20 !bg-gray-200 dark:!bg-accent" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state but don't hide the section
  if (isError) {
    console.error("Error fetching public playlists:", error);
    // Return empty state instead of null to keep section visible
    return null;
  }

  if (playlists.length === 0) {
    return null;
  }

  return <PlaylistRow title="" playlists={playlists} href="/playlists" />;
}

const faqData = [
  {
    question: "What is What2Watch?",
    answer: "What2Watch is a personal watchlist companion that helps you discover, organize, and share your favorite movies and TV shows. With AI-powered recommendations and a vibrant community, you'll never run out of great content to watch.",
  },
  {
    question: "How do I create a playlist?",
    answer: "Creating a playlist is easy! Simply browse our library, find movies or TV shows you want to save, and click the 'Add to Playlist' button. You can create multiple playlists for different moods, genres, or occasions. Playlists can be private or shared publicly with the community.",
  },
  {
    question: "Is What2Watch free to use?",
    answer: "Yes! What2Watch is completely free to use. Sign up with your account to start creating playlists, discovering content, and connecting with other film enthusiasts. No credit card required.",
  },
  {
    question: "How does the recommendation system work?",
    answer: "Our recommendation system uses your viewing preferences, favorite genres, and ratings to suggest content you'll love. The more you interact with the platform—rating movies, creating playlists, and exploring content—the better our recommendations become.",
  },
  {
    question: "Can I share my playlists with others?",
    answer: "Absolutely! When creating a playlist, you can choose to make it public. Public playlists are visible to the entire What2Watch community, allowing others to discover and enjoy your curated collections. You can also share direct links to your playlists.",
  },
  {
    question: "What data sources does What2Watch use?",
    answer: "What2Watch is powered by The Movie Database (TMDB) API, which provides comprehensive and up-to-date information about movies and TV shows, including ratings, cast, crew, trailers, and more. This ensures you have access to accurate and current entertainment data.",
  },
];

function FAQAccordion() {
  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {faqData.map((faq, index) => (
        <AccordionItem
          key={index}
          value={`item-${index}`}
          className="rounded-lg border bg-card px-6"
        >
          <AccordionTrigger className="text-left font-semibold hover:no-underline">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="pb-6 text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default function LandingPage() {
  const router = useRouter();

  const {
    data: trendingMovies = [],
    isLoading: isLoadingTrendingMovies,
  } = useTrendingMovies("week", 1);
  const {
    data: trendingTV = [],
    isLoading: isLoadingTrendingTV,
  } = useTrendingTV("week", 1);

  const slides: HeroSlide[] = useMemo(() => {
    const movieSlides: HeroSlide[] = trendingMovies.slice(0, 5).map((movie) => ({
      id: movie.id,
      type: "movie",
      title: movie.title ?? "Untitled",
      overview: movie.overview ?? "",
      backdrop: movie.backdrop_path,
      poster: movie.poster_path,
      rating: movie.vote_average ?? 0,
      voteCount: movie.vote_count ?? 0,
      year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : null,
      popularity: movie.popularity ?? 0,
    }));

    const tvSlides: HeroSlide[] = trendingTV.slice(0, 5).map((show) => ({
      id: show.id,
      type: "tv",
      title: show.name ?? "Untitled",
      overview: show.overview ?? "",
      backdrop: show.backdrop_path,
      poster: show.poster_path,
      rating: show.vote_average ?? 0,
      voteCount: show.vote_count ?? 0,
      year: show.first_air_date ? new Date(show.first_air_date).getFullYear().toString() : null,
      popularity: show.popularity ?? 0,
    }));

    return [...movieSlides, ...tvSlides];
  }, [trendingMovies, trendingTV]);

  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [slideRuntimes, setSlideRuntimes] = useState<Record<string, number>>({});
  const [isPaused, setIsPaused] = useState(false);
  const playlistScrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(false);
  
  const selectedSlide = slides[selectedSlideIndex] || null;

  // Autoplay carousel - rotate every 8 seconds (paused when user interacts)
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    
    const interval = setInterval(() => {
      isAutoScrollingRef.current = true;
      setSelectedSlideIndex(prev => (prev + 1) % slides.length);
      // Reset flag after a short delay
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 100);
    }, 8000);

    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

  // Reset pause after 10 seconds of inactivity
  useEffect(() => {
    if (!isPaused) return;
    
    const timeout = setTimeout(() => {
      setIsPaused(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isPaused]);

  // Scroll to selected item in playlist (only if not auto-scrolling)
  useEffect(() => {
    if (!playlistScrollRef.current || isAutoScrollingRef.current) return;
    
    const selectedElement = playlistScrollRef.current.querySelector(
      `[data-slide-index="${selectedSlideIndex}"]`
    ) as HTMLElement;
    if (selectedElement) {
      // Find the ScrollArea viewport (parent of the ref element)
      const scrollAreaViewport = playlistScrollRef.current.closest('[data-slot="scroll-area-viewport"]') as HTMLElement;
      if (scrollAreaViewport) {
        const elementTop = selectedElement.offsetTop;
        const elementHeight = selectedElement.offsetHeight;
        const containerTop = scrollAreaViewport.scrollTop;
        const containerHeight = scrollAreaViewport.clientHeight;
        
        // Check if element is not fully visible
        if (elementTop < containerTop || elementTop + elementHeight > containerTop + containerHeight) {
          // Scroll to center the element in the viewport
          scrollAreaViewport.scrollTo({
            top: elementTop - (containerHeight / 2) + (elementHeight / 2),
            behavior: 'smooth',
          });
        }
      } else {
        // Fallback: use scrollIntoView with preventScroll option if available
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedSlideIndex]);

  // Fetch runtime for all slides on mount (for playlist items)
  useEffect(() => {
    if (slides.length === 0) return;

    const fetchAllRuntimes = async () => {
      const promises = slides.map(async (slide) => {
        const key = `${slide.type}-${slide.id}`;
        
        try {
          const response = await fetch(`/api/${slide.type === "movie" ? "movies" : "tv"}/${slide.id}`);
          if (response.ok) {
            const data = await response.json();
            const runtime = slide.type === "movie" 
              ? data.runtime 
              : data.episode_run_time?.[0] || 0;
            // Only return if runtime is valid (greater than 0)
            if (runtime && runtime > 0) {
              return { key, runtime };
            }
          }
        } catch (error) {
          console.error(`Failed to fetch runtime for ${slide.title}:`, error);
        }
        return null;
      });

      const results = await Promise.all(promises);
      const newRuntimes: Record<string, number> = {};
      results.forEach(result => {
        if (result && result.runtime > 0) {
          newRuntimes[result.key] = result.runtime;
        }
      });
      
      if (Object.keys(newRuntimes).length > 0) {
        setSlideRuntimes(prev => {
          const updated = { ...prev };
          Object.keys(newRuntimes).forEach(key => {
            if (!updated[key]) {
              updated[key] = newRuntimes[key];
            }
          });
          return updated;
        });
      }
    };

    fetchAllRuntimes();
  }, [slides.length]); // Only run when slides change

  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState<HeroSlide | null>(null);
  const [trailers, setTrailers] = useState<Record<string, TrailerState>>({});

  const ensureTrailer = useCallback(async (slide: HeroSlide) => {
    const key = `${slide.type}-${slide.id}`;
    const existing = trailers[key];

    if (existing && !existing.loading && (existing.trailer || existing.videos.length === 0 || existing.error)) {
      return;
    }

    setTrailers((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { videos: [], trailer: null }), loading: true, error: undefined },
    }));

    try {
      const response = await fetch(
        `/api/${slide.type === "movie" ? "movies" : "tv"}/${slide.id}/videos`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch trailer");
      }
      const data = await response.json();
      const videos: TMDBVideo[] = data.results || [];
      const officialTrailer =
        videos.find(
          (video) =>
            video.type === "Trailer" &&
            video.official &&
            video.site === "YouTube"
        ) ?? null;
      const fallbackTrailer =
        officialTrailer ??
        videos.find(
          (video) =>
            video.type === "Trailer" && video.site === "YouTube"
        ) ??
        null;

      setTrailers((prev) => ({
        ...prev,
        [key]: {
          videos,
          trailer: fallbackTrailer,
          loading: false,
        },
      }));
      
      // Store trailer duration if available (YouTube API would be needed for actual duration)
      // For now, we'll leave it empty as TMDB doesn't provide video duration
    } catch (error) {
      console.error("Failed to load trailer", error);
      setTrailers((prev) => ({
        ...prev,
        [key]: { videos: [], trailer: null, loading: false, error: "Unable to load trailers right now." },
      }));
    }
  }, [trailers]);

  const handlePlay = useCallback((slide: HeroSlide) => {
    const key = `${slide.type}-${slide.id}`;
    setActiveTrailerKey(key);
    setActiveSlide(slide);
    setIsTrailerModalOpen(true);
    void ensureTrailer(slide);
  }, [ensureTrailer]);

  const activeTrailer = activeTrailerKey ? trailers[activeTrailerKey] : undefined;
  const heroIsLoading = isLoadingTrendingMovies || isLoadingTrendingTV;

  const features = [
    {
      title: "Personalized Discovery",
      description: "AI-powered recommendations that learn from your preferences and viewing history.",
      icon: Compass,
    },
    {
      title: "Community Curation",
      description: "Follow trusted curators and discover what the community is watching.",
      icon: Users,
    },
    {
      title: "Smart Playlists",
      description: "Create, share, and collaborate on playlists with friends in real-time.",
      icon: Clapperboard,
    },
    {
      title: "Live Trends",
      description: "Stay ahead with real-time trending content from around the world.",
      icon: TrendingUp,
    },
  ];

  const stats = [
    { value: "12K+", label: "Movies & TV Shows" },
    { value: "48K+", label: "Active Users" },
    { value: "96K+", label: "Reviews" },
    { value: "8.5K+", label: "Playlists" },
  ];

  const handleTrailerDetails = useCallback(() => {
    router.push("/browse");
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/20 py-20 sm:py-28 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Discover what to watch next
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your personal
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> watchlist</span>
              <br />
              companion
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Discover, curate, and share your favorite movies and TV shows with AI-powered recommendations
              and a vibrant community of film enthusiasts.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <SignInButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </SignInButton>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/browse">Browse Library</Link>
              </Button>
            </div>
          </div>

          {/* Trending Carousel - YouTube Style */}
          <div className="mx-auto mt-16 max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Trending Now</h2>
              <Link href="/browse" className="text-sm text-muted-foreground hover:text-foreground">
                View all →
              </Link>
            </div>
            {heroIsLoading ? (
              <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[1fr_400px]">
                {/* Left Column - Featured Content Skeleton */}
                <div className="relative h-[400px] sm:h-[500px] md:h-[600px] w-full overflow-hidden rounded-lg bg-muted">
                  <Skeleton className="absolute inset-0 w-full h-full !bg-gray-200 dark:!bg-accent" />
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-6">
                    <div className="grid gap-4 sm:gap-6 grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr] md:grid-cols-[200px_1fr]">
                      {/* Poster Skeleton */}
                      <Skeleton className="aspect-[2/3] w-full max-w-[200px] rounded-lg !bg-gray-200 dark:!bg-accent" />
                      {/* Details Skeleton */}
                      <div className="flex flex-col justify-end gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 rounded-full !bg-gray-200 dark:!bg-accent" />
                          <Skeleton className="h-4 w-16 !bg-gray-200 dark:!bg-accent" />
                        </div>
                        <Skeleton className="h-6 sm:h-8 md:h-10 w-3/4 !bg-gray-200 dark:!bg-accent" />
                        <Skeleton className="h-4 w-32 !bg-gray-200 dark:!bg-accent" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Playlist Skeleton */}
                <div className="relative hidden xl:block overflow-hidden">
                  <Skeleton className="h-5 w-20 mb-3 !bg-gray-200 dark:!bg-accent" />
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-3 rounded-lg p-3">
                        <Skeleton className="h-20 w-[140px] flex-shrink-0 rounded !bg-gray-200 dark:!bg-accent" />
                        <div className="flex flex-1 flex-col justify-between gap-2">
                          <Skeleton className="h-8 w-8 rounded-full !bg-gray-200 dark:!bg-accent" />
                          <Skeleton className="h-4 w-3/4 !bg-gray-200 dark:!bg-accent" />
                          <Skeleton className="h-3 w-1/2 !bg-gray-200 dark:!bg-accent" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : slides.length > 0 ? (
              <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[1fr_400px]">
                {/* Left Column - Featured Content */}
                <div 
                  className="relative h-[400px] sm:h-[500px] md:h-[600px] w-full overflow-hidden rounded-lg bg-muted"
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                >
                  <FeaturedContent
                    slide={selectedSlide}
                    onPlay={handlePlay}
                    trailerDuration={selectedSlide ? (() => {
                      const runtime = slideRuntimes[`${selectedSlide.type}-${selectedSlide.id}`];
                      // Return runtime in minutes (will be formatted appropriately)
                      return runtime && runtime > 0 ? runtime : undefined;
                    })() : undefined}
                    onPrevious={() => {
                      setIsPaused(true);
                      setSelectedSlideIndex(prev => (prev - 1 + slides.length) % slides.length);
                    }}
                    onNext={() => {
                      setIsPaused(true);
                      setSelectedSlideIndex(prev => (prev + 1) % slides.length);
                    }}
                    canGoPrevious={slides.length > 1}
                    canGoNext={slides.length > 1}
                  />
                </div>

                {/* Right Column - Playlist (hidden below xl breakpoint) */}
                <div className="relative hidden xl:block overflow-hidden">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Up Next</h3>
                  </div>
                  
                  <ScrollArea className="h-[570px] pr-4">
                    <div ref={playlistScrollRef} className="space-y-2">
                      {slides.map((slide, index) => {
                        const isSelected = index === selectedSlideIndex;
                        const runtime = slideRuntimes[`${slide.type}-${slide.id}`];
                        return (
                          <PlaylistItem
                            key={`${slide.type}-${slide.id}-${index}`}
                            slide={slide}
                            isSelected={isSelected}
                            runtime={runtime}
                            onClick={() => {
                              setIsPaused(true);
                              setSelectedSlideIndex(index);
                            }}
                            onPlay={handlePlay}
                            index={index}
                          />
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b bg-muted/30 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to discover great content
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed to help you find, organize, and share your favorite entertainment.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="rounded-lg border bg-card p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t bg-muted/20 py-20 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                How it works
              </h2>
              <p className="text-lg text-muted-foreground">
                Get started in minutes with our simple onboarding process
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">Sign Up</h3>
                <p className="text-sm text-muted-foreground">
                  Create your account and complete a quick onboarding to personalize your experience
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">Discover</h3>
                <p className="text-sm text-muted-foreground">
                  Browse trending content, explore personalized recommendations, and find your next watch
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-xl font-bold">3</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">Share</h3>
                <p className="text-sm text-muted-foreground">
                  Create playlists, share with friends, and join the community to discuss your favorites
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Playlists Section */}
      <section className="border-t py-20 sm:py-24 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Explore User Playlists
              </h2>
              <p className="mt-2 text-lg text-muted-foreground">
                Discover curated collections from our community
              </p>
            </div>
            <Link href="/playlists" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
              View all →
            </Link>
          </div>
          <div className="overflow-hidden sm:overflow-visible">
            <PublicPlaylistsCarousel />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t py-20 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center sm:p-12">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to discover your next favorite?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join thousands of users discovering great content every day
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <SignInButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </SignInButton>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/browse">Explore Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t bg-muted/20 py-20 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to know about What2Watch
              </p>
            </div>
            <FAQAccordion />
          </div>
        </div>
      </section>

      {/* Main Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="mb-4 font-semibold">What2Watch</h3>
              <p className="text-sm text-muted-foreground">
                Your personal watchlist companion for discovering great movies and TV shows.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Discover</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/browse" className="text-muted-foreground hover:text-foreground">
                    Browse
                  </Link>
                </li>
                <li>
                  <Link href="/movies" className="text-muted-foreground hover:text-foreground">
                    Movies
                  </Link>
                </li>
                <li>
                  <Link href="/tv" className="text-muted-foreground hover:text-foreground">
                    TV Shows
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/my-list" className="text-muted-foreground hover:text-foreground">
                    My List
                  </Link>
                </li>
                <li>
                  <Link href="/playlists" className="text-muted-foreground hover:text-foreground">
                    Playlists
                  </Link>
                </li>
                <li>
                  <Link href="/forums" className="text-muted-foreground hover:text-foreground">
                    Forums
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-muted-foreground hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4">
            {/* Powered by TMDB */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">Powered by</p>
              <Link
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/moviedb-logo2.svg"
                  alt="The Movie Database"
                  width={80}
                  height={16}
                  className="h-4 w-auto"
                />
              </Link>
            </div>
            {/* Copyright */}
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} What2Watch. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <TrailerModal
        video={activeTrailer?.trailer ?? null}
        videos={activeTrailer?.videos ?? []}
        isOpen={isTrailerModalOpen}
        onClose={() => setIsTrailerModalOpen(false)}
        title={activeSlide?.title ?? "Trailer"}
        isLoading={!activeTrailer || activeTrailer.loading}
        hasNoVideos={!!activeTrailer && !activeTrailer.loading && activeTrailer.videos.length === 0}
        errorMessage={activeTrailer?.error}
        onOpenDetails={handleTrailerDetails}
      />
    </div>
  );
}

type FeaturedContentProps = {
  slide: HeroSlide;
  onPlay: (slide: HeroSlide) => void;
  trailerDuration?: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

function FeaturedContent({ slide, onPlay, trailerDuration, onPrevious, onNext, canGoPrevious, canGoNext }: FeaturedContentProps) {
  const formatDuration = (minutes?: number) => {
    if (!minutes || minutes === 0) return "";
    // Format runtime in minutes as HH:MM or MM:MM
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}:${mins.toString().padStart(2, "0")}` : `${mins}:00`;
  };

  // Convert slide to TMDBMovie or TMDBSeries for AddToPlaylistDropdown
  const item: TMDBMovie | TMDBSeries = slide.type === "movie"
    ? {
        id: slide.id,
        title: slide.title,
        overview: slide.overview,
        poster_path: slide.poster,
        backdrop_path: slide.backdrop,
        release_date: slide.year || "",
        vote_average: slide.rating,
        vote_count: slide.voteCount,
        genre_ids: [],
        popularity: slide.popularity,
        adult: false,
        original_language: "en",
        original_title: slide.title,
      } as TMDBMovie
    : {
        id: slide.id,
        name: slide.title,
        overview: slide.overview,
        poster_path: slide.poster,
        backdrop_path: slide.backdrop,
        first_air_date: slide.year || "",
        vote_average: slide.rating,
        vote_count: slide.voteCount,
        genre_ids: [],
        popularity: slide.popularity,
        original_language: "en",
        original_name: slide.title,
      } as TMDBSeries;

  return (
    <div className="relative h-full w-full">
      {/* Wallpaper Background */}
      {slide.backdrop ? (
        <Image
          src={getBackdropUrl(slide.backdrop, "w1280")}
          alt={slide.title}
          fill
          className="object-cover transition-opacity duration-500"
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent dark:from-black dark:via-black/80" />

      {/* Bottom Section - Poster and Details */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-6">
        {/* Carousel Controls - Positioned slightly above poster */}
        {canGoPrevious && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-2 sm:left-4 bottom-[calc(100%-280px)] sm:bottom-[340px] z-20 h-10 w-10 sm:h-11 sm:w-11 cursor-pointer rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 transition-all duration-300 ease-in-out"
            onClick={onPrevious}
          >
            <ChevronLeft className="size-6 sm:size-7 text-white transition-transform duration-300" />
          </Button>
        )}
        {canGoNext && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 sm:right-4 bottom-[calc(100%-280px)] sm:bottom-[340px] z-20 h-10 w-10 sm:h-11 sm:w-11 cursor-pointer rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 transition-all duration-300 ease-in-out"
            onClick={onNext}
          >
            <ChevronRight className="size-6 sm:size-7 text-white transition-transform duration-300" />
          </Button>
        )}
        <div className="grid gap-4 sm:gap-6 grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr] md:grid-cols-[200px_1fr]">
          {/* Poster Column */}
          {slide.poster && (
            <div className="relative aspect-[2/3] w-full max-w-[200px] overflow-hidden rounded-lg">
              <Image
                src={getPosterUrl(slide.poster, "w500")}
                alt={slide.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 120px, (max-width: 768px) 150px, 200px"
              />
              {/* Add to Playlist Button - Top Right */}
              <div className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2">
                <AddToPlaylistDropdown
                  item={item}
                  type={slide.type}
                  trigger={
                    <Button
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 cursor-pointer rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 transition-all duration-300 ease-in-out"
                    >
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white transition-transform duration-300" />
                    </Button>
                  }
                />
              </div>
            </div>
          )}

          {/* Details Column */}
          <div className="flex flex-col justify-end">
            <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <Button
                size="icon"
                onClick={() => onPlay(slide)}
                className="h-12 w-12 sm:h-14 sm:w-14 cursor-pointer rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 transition-all duration-300 ease-in-out"
              >
                <Play className="size-7 fill-current text-white transition-transform duration-300" />
              </Button>
              {trailerDuration && formatDuration(trailerDuration) && (
                <span className="text-xs sm:text-sm font-medium text-white">{formatDuration(trailerDuration)}</span>
              )}
            </div>
            <h3 className="mb-1 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white transition-opacity duration-500 line-clamp-2">{slide.title}</h3>
            <p className="text-xs sm:text-sm text-white/80 transition-opacity duration-500">Watch the trailer</p>
          </div>
        </div>
      </div>
    </div>
  );
}

type PlaylistItemProps = {
  slide: HeroSlide;
  isSelected: boolean;
  runtime?: number;
  onClick: () => void;
  onPlay: (slide: HeroSlide) => void;
  index: number;
};

function PlaylistItem({ slide, isSelected, runtime, onClick, onPlay, index }: PlaylistItemProps) {
  const formatRuntime = (minutes?: number) => {
    if (!minutes || minutes === 0) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}:${mins.toString().padStart(2, "0")}` : `0:${mins.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "group flex cursor-pointer gap-3 rounded-lg p-3 transition-all duration-300",
        isSelected
          ? "bg-primary/10"
          : "bg-card hover:bg-muted/50"
      )}
      onClick={onClick}
      data-slide-index={index}
    >
      {/* Thumbnail */}
      <div className="relative h-20 w-[140px] flex-shrink-0 overflow-hidden rounded">
        {slide.poster ? (
          <Image
            src={getPosterUrl(slide.poster, "w300")}
            alt={slide.title}
            fill
            className="object-cover"
            sizes="140px"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 flex-shrink-0 cursor-pointer rounded-full bg-background/90 hover:bg-background transition-all duration-300 ease-in-out"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(slide);
            }}
          >
            <Play className="h-3.5 w-3.5 fill-current transition-transform duration-300" />
          </Button>
          {runtime && formatRuntime(runtime) && (
            <span className="text-xs font-medium text-muted-foreground">{formatRuntime(runtime)}</span>
          )}
        </div>
        <h4 className={cn(
          "line-clamp-2 font-medium",
          isSelected ? "text-primary" : "text-foreground"
        )}>
          {slide.title}
        </h4>
        <p className="text-xs text-muted-foreground">Watch the trailer</p>
      </div>
    </div>
  );
}
