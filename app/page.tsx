'use client';

import { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Play,
  ArrowRight,
  Clapperboard,
  Users,
  Compass,
  Star,
  ShieldCheck,
  MessageSquare,
  Film,
  Tv,
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
    const movieSlides: HeroSlide[] = trendingMovies.slice(0, 6).map((movie) => ({
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

    const tvSlides: HeroSlide[] = trendingTV.slice(0, 6).map((show) => ({
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

  const stats = [
    { label: "Catalogued Titles", value: "12K+", icon: Film },
    { label: "Active Curators", value: "48K+", icon: Users },
    { label: "Reviews Logged", value: "96K+", icon: MessageSquare },
    { label: "Playlists Shared", value: "8.5K+", icon: Clapperboard },
  ];

  const featureHighlights = [
    {
      title: "Adaptive Discovery Engine",
      description:
        "Our AI fuses your onboarding preferences with live viewing history to surface stories that feel hand-picked for you.",
      icon: Compass,
    },
    {
      title: "Cinematic Spotlight",
      description:
        "Preview what’s trending globally with a cinematic trailer hub inspired by IMDb’s experience.",
      icon: Star,
    },
    {
      title: "Community-Driven Signals",
      description:
        "Track what the community is buzzing about and join forum conversations without leaving the flow.",
      icon: Users,
    },
  ];

  const experienceBlocks = [
    {
      title: "Personalized Launchpad",
      body: "Onboarding tunes the algorithm from the first screen. Your hero carousel and feed react instantly to your vibe.",
      accent: "Primary",
    },
    {
      title: "Immersive Playlists",
      body: "Build, remix, and share thematic playlists. Spark watch parties with just a link.",
      accent: "Secondary",
    },
    {
      title: "Signal Boost",
      body: "Trending rows update live with TMDB’s global pulse so you never miss what the world is watching right now.",
      accent: "Muted",
    },
  ];

  const securityHighlights = [
    {
      title: "Privacy-First Profiles",
      body: "Control what the community sees with granular visibility settings.",
      icon: ShieldCheck,
    },
    {
      title: "Curated Trust Signals",
      body: "Ratings and reviews surface from voices you trust most, not random noise.",
      icon: Star,
    },
    {
      title: "Seamless Collaboration",
      body: "Co-create watchlists with friends and discuss episodes in real time forums.",
      icon: MessageSquare,
    },
  ];

  const handleTrailerDetails = useCallback(() => {
    router.push("/browse");
  }, [router]);

  return (
    <div className="relative min-h-screen bg-[#05040c] text-white overflow-hidden">
      <Navbar />

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-black to-black" />
        <div className="absolute -top-40 -left-20 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[160px]" />
        <div className="absolute top-[30%] -right-32 h-[520px] w-[520px] rounded-full bg-purple-600/20 blur-[200px]" />
        <div className="absolute bottom-0 left-1/2 h-[380px] w-[380px] -translate-x-1/2 bg-cyan-500/10 blur-[180px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.12] mix-blend-soft-light" />
      </div>

      <main className="flex flex-col gap-32 pb-24">
        {/* Hero */}
        <section className="relative pt-28">
          <div className="container mx-auto px-4 lg:px-10 xl:px-16">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-widest text-white/70">
                  <Sparkles className="h-4 w-4 text-primary" />
                  A cinematic discovery surface
                </div>
                <h1 className="mt-6 text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
                  Watch the future
                  <span className="block bg-gradient-to-r from-primary via-sky-400 to-purple-400 bg-clip-text text-transparent">
                    unfold in real time
                  </span>
                </h1>
                <p className="mt-4 max-w-2xl text-lg text-white/70 md:text-xl">
                  Dive into a luminous carousel of this week’s most talked-about movies and TV shows. Curated using TMDB signals and your taste blueprint.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <SignInButton mode="modal">
                    <Button size="lg" className="bg-primary px-7 py-6 text-base shadow-[0_0_40px_rgba(59,130,246,0.25)] transition hover:bg-primary/90">
                      Start Your Journey
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </SignInButton>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="px-7 py-6 text-base text-white hover:bg-white/10"
                    asChild
                  >
                    <Link href="/browse">Browse the Universe</Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 rounded-2xl border border-white/10 bg-white/5/10 p-6 backdrop-blur-2xl md:max-w-lg">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="group rounded-xl border border-white/10 bg-black/40 px-4 py-5 shadow-[inset_0_0_40px_rgba(255,255,255,0.05)] transition hover:border-primary/40"
                  >
                    <stat.icon className="mb-3 h-5 w-5 text-primary transition group-hover:scale-110" />
                    <p className="text-2xl font-semibold text-white md:text-3xl">
                      {stat.value}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-white/60">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-6 shadow-[0_20px_120px_rgba(59,130,246,0.15)] backdrop-blur-2xl">
              <div className="absolute inset-0 rounded-[32px] border border-white/5" />
              <div className="absolute inset-0 rounded-[32px] bg-[linear-gradient(120deg,rgba(59,130,246,0.08),rgba(147,51,234,0.05))]" />

              <Carousel
                opts={{ align: "start", loop: true }}
                setApi={setCarouselApi}
                className="relative"
              >
                <CarouselContent>
                  {(heroIsLoading || slides.length === 0) && (
                    <CarouselItem>
                      <div className="flex min-h-[60vh] items-center justify-center rounded-[24px] border border-white/5 bg-black/40">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-white/60" />
                          <p className="text-sm uppercase tracking-[0.35em] text-white/50">
                            Initializing spotlight reel
                          </p>
                        </div>
                      </div>
                    </CarouselItem>
                  )}

                  {slides.map((slide, index) => (
                    <CarouselItem key={`${slide.type}-${slide.id}-${index}`}>
                      <HeroSlideCard
                        slide={slide}
                        onPlay={handlePlay}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>

                <CarouselPrevious className="hidden sm:flex border-white/20 bg-black/60 text-white hover:border-primary/40 hover:bg-primary/80/30" />
                <CarouselNext className="hidden sm:flex border-white/20 bg-black/60 text-white hover:border-primary/40 hover:bg-primary/80/30" />
              </Carousel>

              {slides.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {slides.slice(0, 8).map((_, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          activeIndex === idx
                            ? "w-8 bg-primary"
                            : "w-4 bg-white/20"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Trending now
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="relative">
          <div className="container mx-auto px-4 lg:px-10 xl:px-16">
            <div className="mb-16 max-w-3xl">
              <h2 className="text-3xl font-bold md:text-4xl">
                A discovery engine designed for the streaming era
              </h2>
              <p className="mt-4 text-base text-white/65 md:text-lg">
                We blend adaptive personalization with real-time cultural signals so your queue stays one step ahead of the conversation.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {featureHighlights.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-primary/40"
                >
                  <div className="absolute inset-x-0 -top-40 h-40 bg-gradient-to-b from-primary/20 to-transparent opacity-0 blur-2xl transition group-hover:opacity-100" />
                  <feature.icon className="mb-5 h-9 w-9 text-primary transition group-hover:scale-110" />
                  <h3 className="text-xl font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm text-white/60">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Experience blocks */}
        <section className="relative">
          <div className="container mx-auto px-4 lg:px-10 xl:px-16">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 backdrop-blur-2xl">
                  <p className="text-sm uppercase tracking-[0.35em] text-primary">
                    built for taste-makers
                  </p>
                  <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                    The immersive watchlist studio
                  </h2>
                  <p className="mt-4 text-base text-white/65 md:text-lg">
                    Craft cinematic journeys, follow curators you trust, and sync your viewing log across every screen. What2Watch is your command center for fandom.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4 text-sm uppercase tracking-[0.35em] text-white/50">
                    <span className="rounded-full border border-white/10 px-4 py-2">
                      Personalized rows
                    </span>
                    <span className="rounded-full border border-white/10 px-4 py-2">
                      Watch parties
                    </span>
                    <span className="rounded-full border border-white/10 px-4 py-2">
                      Social proof
                    </span>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  {experienceBlocks.map((block) => (
                    <div
                      key={block.title}
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-6 shadow-inner shadow-white/5"
                    >
                      <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                        {block.accent}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold text-white">
                        {block.title}
                      </h3>
                      <p className="mt-2 text-sm text-white/60">
                        {block.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.35),transparent_55%)]" />
                <div className="relative z-10 space-y-6">
                  <p className="text-sm uppercase tracking-[0.35em] text-white/50">
                    Community spotlight
                  </p>
                  <h3 className="text-2xl font-semibold leading-relaxed">
                    Spark conversations. Drop reactions. Co-create playlists with friends in real time.
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <span
                          key={idx}
                          className="h-10 w-10 rounded-full border-2 border-white/10 bg-white/20"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-white/60">
                      “I’ve replaced IMDb’s watchlist entirely — the trailer hub is addictive.”
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="group mt-4 inline-flex items-center gap-2 text-white hover:bg-white/10"
                    asChild
                  >
                    <Link href="/forums">
                      Join the conversation
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & security */}
        <section className="relative">
          <div className="container mx-auto px-4 lg:px-10 xl:px-16">
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-10 shadow-[0_40px_120px_rgba(15,23,42,0.4)] backdrop-blur-2xl">
              <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-primary">
                    Safe & curated
                  </p>
                  <h2 className="mt-2 text-3xl font-bold md:text-4xl">
                    Calm, secure, and built for trustworthy discovery
                  </h2>
                </div>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/privacy">Explore our privacy model</Link>
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {securityHighlights.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-black/50 p-6"
                  >
                    <item.icon className="mb-4 h-6 w-6 text-primary" />
                    <h3 className="text-lg font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/60">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative">
          <div className="container mx-auto px-4 lg:px-10 xl:px-16">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent px-8 py-12 backdrop-blur-2xl md:px-12 md:py-16">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.15),transparent)]" />
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-white/60">
                    Ready when you are
                  </p>
                  <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                    Spin up your personalized theatre in seconds.
                  </h2>
                  <p className="mt-2 text-base text-white/70">
                    Sign in with Clerk, calibrate your preferences, and watch the hero carousel morph in real time.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <SignInButton mode="modal">
                    <Button
                      size="lg"
                      className="bg-white px-7 py-5 text-base font-semibold text-black hover:bg-white/90"
                    >
                      Launch What2Watch
                    </Button>
                  </SignInButton>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="border-white/20 px-7 py-5 text-base text-white hover:bg-white/10"
                    asChild
                  >
                    <Link href="/browse">Preview the experience</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-white/70">
        <div className="container mx-auto grid gap-8 px-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-base font-semibold text-white">What2Watch</h3>
            <p className="mt-3 text-xs text-white/50">
              The futuristic watch platform powered by personalization, community, and live trends.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Discover</h4>
            <ul className="mt-3 space-y-2">
              <li><Link href="/browse" className="hover:text-white">Browse</Link></li>
              <li><Link href="/movies" className="hover:text-white">Movies</Link></li>
              <li><Link href="/tv" className="hover:text-white">TV Shows</Link></li>
              <li><Link href="/forums" className="hover:text-white">Community</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Platform</h4>
            <ul className="mt-3 space-y-2">
              <li><Link href="/my-list" className="hover:text-white">My List</Link></li>
              <li><Link href="/playlists" className="hover:text-white">Playlists</Link></li>
              <li><Link href="/settings" className="hover:text-white">Settings</Link></li>
              <li><Link href="/forums" className="hover:text-white">Forums</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <ul className="mt-3 space-y-2">
              <li><Link href="/about" className="hover:text-white">About</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} What2Watch. Crafted for fans, powered by data.
        </div>
      </footer>

      <TrailerModal
        video={activeTrailer?.trailer ?? null}
        videos={activeTrailer?.videos ?? []}
        isOpen={isTrailerModalOpen}
        onClose={() => setIsTrailerModalOpen(false)}
        title={activeSlide?.title ?? "Trailer"}
        isLoading={
          !activeTrailer || activeTrailer.loading
        }
        hasNoVideos={
          !!activeTrailer && !activeTrailer.loading && activeTrailer.videos.length === 0
        }
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
    <div className="relative min-h-[60vh] overflow-hidden rounded-[24px] border border-white/10 bg-black/60 shadow-[0_30px_120px_rgba(15,23,42,0.55)]">
      <div className="absolute inset-0">
        {slide.backdrop ? (
          <Image
            src={getBackdropUrl(slide.backdrop, "w1280")}
            alt={slide.title}
            fill
            className="object-cover opacity-70 transition duration-700 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 90vw"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-900 via-black to-slate-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col justify-between gap-6 px-6 py-8 md:flex-row md:px-10 md:py-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/50">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-white/60 backdrop-blur">
              {slide.type === "movie" ? (
                <Film className="h-3 w-3 text-primary" />
              ) : (
                <Tv className="h-3 w-3 text-purple-400" />
              )}
              {slide.type === "movie" ? "Movie" : "TV"}
            </span>
            {slide.year && <span>{slide.year}</span>}
            <span>{Math.round(slide.popularity)} pulse</span>
          </div>
          <h3 className="mt-4 text-3xl font-bold md:text-4xl lg:text-5xl">
            {slide.title}
          </h3>
          <p className="mt-4 line-clamp-4 text-base text-white/70 md:text-lg">
            {slide.overview || "A must-watch currently captivating viewers worldwide."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
              <Star className="h-4 w-4 text-yellow-400" />
              {slide.rating.toFixed(1)} ({slide.voteCount.toLocaleString()} votes)
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
              Trending worldwide
            </span>
          </div>
          <div className="mt-7 flex flex-wrap gap-4">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-white/90"
              onClick={() => onPlay(slide)}
            >
              <Play className="mr-2 h-4 w-4" />
              Play Trailer
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="border-white/20 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/browse">More details</Link>
            </Button>
          </div>
        </div>

        {slide.poster && (
          <div className="hidden w-full max-w-xs shrink-0 self-end rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_80px_rgba(59,130,246,0.25)] backdrop-blur lg:block">
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10">
              <Image
                src={getPosterUrl(slide.poster, "w500")}
                alt={slide.title}
                fill
                className="object-cover"
                sizes="200px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </div>
            <div className="mt-4 space-y-3 text-sm text-white/65">
              <p>
                Feature spotlight selected by our adaptive discovery engine. Keep watching to refine your reel.
              </p>
              <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs uppercase tracking-[0.35em] text-white/50">
                curated for you
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
