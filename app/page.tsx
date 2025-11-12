'use client';

import { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  ArrowRight,
  Sparkles,
  Film,
  Users,
  MessageSquare,
  Clapperboard,
  Star,
  ShieldCheck,
  Compass,
  Check,
  Zap,
  TrendingUp,
} from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import Navbar from "@/components/navbar/navbar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import TrailerModal from "@/components/browse/trailer-modal";
import {
  useTrendingMovies,
  useTrendingTV,
} from "@/hooks/use-movies";
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

  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => {
      setActiveIndex(carouselApi.selectedScrollSnap());
    };
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

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

          {/* Trending Carousel */}
          <div className="mx-auto mt-16 max-w-6xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Trending Now</h2>
              <Link href="/browse" className="text-sm text-muted-foreground hover:text-foreground">
                View all →
              </Link>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <Carousel
                opts={{ align: "start", loop: true }}
                setApi={setCarouselApi}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {heroIsLoading && (
                    <CarouselItem className="pl-2 md:pl-4">
                      <div className="flex h-[400px] items-center justify-center rounded-lg border bg-muted">
                        <div className="text-center">
                          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                          <p className="text-sm text-muted-foreground">Loading trending content...</p>
                        </div>
                      </div>
                    </CarouselItem>
                  )}
                  {slides.map((slide, index) => (
                    <CarouselItem key={`${slide.type}-${slide.id}-${index}`} className="pl-2 md:pl-4">
                      <HeroSlideCard slide={slide} onPlay={handlePlay} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
              </Carousel>
              {slides.length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {slides.slice(0, 8).map((_, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        activeIndex === idx
                          ? "w-8 bg-primary"
                          : "w-1.5 bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
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
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group rounded-lg border bg-card p-6 transition-all hover:shadow-md"
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

      {/* Footer */}
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
          <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} What2Watch. All rights reserved.
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

type HeroSlideCardProps = {
  slide: HeroSlide;
  onPlay: (slide: HeroSlide) => void;
};

function HeroSlideCard({ slide, onPlay }: HeroSlideCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card">
      <div className="relative aspect-video w-full">
        {slide.backdrop ? (
          <Image
            src={getBackdropUrl(slide.backdrop, "w1280")}
            alt={slide.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
        <div className="absolute inset-0 flex items-end p-6">
          <div className="w-full">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-2 py-1">
                {slide.type === "movie" ? (
                  <Film className="h-3 w-3" />
                ) : (
                  <span className="text-xs">TV</span>
                )}
                {slide.type === "movie" ? "Movie" : "TV Show"}
              </span>
              {slide.year && <span>{slide.year}</span>}
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {slide.rating.toFixed(1)}
              </span>
            </div>
            <h3 className="mb-2 text-xl font-bold sm:text-2xl">{slide.title}</h3>
            <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
              {slide.overview || "A must-watch currently captivating viewers worldwide."}
            </p>
            <Button onClick={() => onPlay(slide)} size="sm">
              <Play className="mr-2 h-4 w-4" />
              Play Trailer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
