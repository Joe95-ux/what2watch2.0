'use client';

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Users,
  Clapperboard,
  Compass,
  Plus,
  Tv,
  CheckCircle2,
  Search,
  Film,
} from "lucide-react";
import { SignInButton, useUser } from "@clerk/nextjs";
import Navbar from "@/components/navbar/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicPlaylists } from "@/hooks/use-playlists";
import { usePublicLists } from "@/components/lists/public-lists-content";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import PlaylistCard from "@/components/browse/playlist-card";
import ListCard from "@/components/browse/list-card";
import { Playlist } from "@/hooks/use-playlists";
import { cn } from "@/lib/utils";
import { SiNetflix, SiAmazonprime, SiHulu, SiHbo, SiApple } from "react-icons/si";


function CuratedListsCarousel() {
  const { data: lists = [], isLoading: isLoadingLists } = usePublicLists(10);
  const { data: playlists = [], isLoading: isLoadingPlaylists, isError, error } = usePublicPlaylists(10);

  const isLoading = isLoadingLists || isLoadingPlaylists;

  // Combine lists and playlists
  const allItems = [
    ...lists.map((list) => ({ type: "list" as const, data: list })),
    ...playlists.map((playlist) => ({ type: "playlist" as const, data: playlist })),
  ].slice(0, 20);

  if (isLoading) {
    return (
      <div className="mb-12">
        <div className="relative">
          <div className="overflow-x-hidden">
            <div className="flex gap-3 px-4 sm:px-6 lg:px-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-shrink-0">
                  <Skeleton className="w-full aspect-[3/4] rounded-lg !bg-gray-200 dark:!bg-accent" />
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
    console.error("Error fetching curated lists:", error);
    // Return empty state instead of null to keep section visible
    return null;
  }

  if (allItems.length === 0) {
    return null;
  }

  return (
    <div className="relative group/carousel">
      <Carousel
        opts={{
          align: "start",
          slidesToScroll: 1,
          breakpoints: {
            "(max-width: 600px)": { slidesToScroll: 1, dragFree: true }, // 1 item per view, dragFree for mobile
            "(min-width: 601px)": { slidesToScroll: 2 }, // 2 items per view
            "(min-width: 1025px)": { slidesToScroll: 3 }, // 3 items per view (max)
          },
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4 gap-0">
          {allItems.map((item) => (
            <CarouselItem key={`${item.type}-${item.data.id}`} className="pl-2 md:pl-4 basis-1/1 sm:basis-1/2 lg:basis-1/3">
              {item.type === "list" ? (
                <ListCard list={item.data} variant="carousel" />
              ) : (
                <PlaylistCard playlist={item.data} variant="carousel" />
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious 
          className="left-0 h-[225px] w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
        />
        <CarouselNext 
          className="right-0 h-[225px] w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
        />
      </Carousel>
    </div>
  );
}

import { FAQAccordion } from "@/components/landing/faq-accordion";

export default function LandingPage() {
  const { isSignedIn } = useUser();

  const features = [
    {
      title: "AI-Powered Discovery",
      description: "Get hyper-personalized recommendations that understand exactly what you're in the mood for.",
      icon: Sparkles,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Community Curation",
      description: "Follow trusted curators, read engaging reviews, and discover what your friends are watching.",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Smart Playlists",
      description: "Build cinematic collections and collaborate in real-time with friends to plan your next watch party.",
      icon: Clapperboard,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  const stats = [
    { value: "12K+", label: "Movies & TV Shows" },
    { value: "48K+", label: "Active Users" },
    { value: "96K+", label: "Reviews" },
    { value: "8.5K+", label: "Playlists" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section with Modern Design */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b">
        {/* Subtle background effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-50" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background to-background z-10" />
        </div>

        <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 lg:pt-32 pb-24">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-foreground shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              Discover what to watch next
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your personal{" "}
              <span className="inline-block bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
                watchlist
              </span>
              <br />
              companion
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
              Discover, curate, and share your favorite movies and TV shows with AI-powered recommendations
              and a vibrant community of film enthusiasts.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isSignedIn ? (
                <Button size="lg" className="w-full sm:w-auto rounded-full shadow-lg hover:shadow-xl transition-all" asChild>
                  <Link href="/dashboard/profile">
                    Visit Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <SignInButton mode="modal">
                  <Button size="lg" className="w-full sm:w-auto rounded-full shadow-lg hover:shadow-xl transition-all">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </SignInButton>
              )}
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full backdrop-blur-sm" asChild>
                <Link href="/browse">Browse Library</Link>
              </Button>
            </div>
          </div>
          
          {/* Image Card - Sinks into bottom */}
          <div className="relative mx-auto max-w-5xl -mb-8">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src="/hero-list-img.png"
                  alt="Watchlist"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1280px"
                  priority
                  quality={90}
                />
                <div className="absolute inset-0 bg-black/30" />
              </div>
            </div>
            <div className="absolute -bottom-6 left-0 right-0 h-12 bg-background rounded-t-3xl" />
          </div>
        </div>
      </section>


      {/* Watch Availability Section */}
      <section className="py-24 relative overflow-hidden bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm font-medium">
                <Search className="h-4 w-4 text-primary" />
                Global Availability
              </div>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
                Know exactly where to watch
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Stop jumping between streaming apps. <strong className="text-foreground">What2Watch</strong> instantly tells you exactly where any movie or show is available to stream, rent, or buy in your country, thanks to our integration with JustWatch.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Global streaming data across 100+ platforms",
                  "Filter lists by your subscribed services",
                  "Find the best price for renting or buying",
                  "Get alerts when titles arrive on your platforms"
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="order-1 lg:order-2 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-card/50 backdrop-blur-sm p-6 lg:p-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <Tv className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Dune: Part Two</h3>
                    <p className="text-xs text-muted-foreground">Available to stream now</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Stream</p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { Icon: SiNetflix, name: "Netflix", color: "#E50914" },
                        { Icon: SiAmazonprime, name: "Prime Video", color: "#00A8E1" },
                        { Icon: SiHbo, name: "Max", color: "#5821A8" },
                      ].map((service, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer transition-transform hover:-translate-y-1">
                          <div 
                            className="w-12 h-12 rounded-lg bg-black border border-gray-800 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all"
                            style={{ boxShadow: `0 0 0 0 ${service.color}20`, transition: "all 0.3s" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = `0 0 20px ${service.color}40`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = "0 0 0 0 transparent";
                            }}
                          >
                            <service.Icon className="w-6 h-6" style={{ color: service.color }} />
                          </div>
                          <span className="text-xs font-medium">{service.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Rent / Buy</p>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex flex-col items-center gap-2 group cursor-pointer transition-transform hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center shadow-lg dark:bg-black dark:border-gray-800 transition-all">
                          <SiApple className="w-6 h-6 text-black dark:text-white" />
                        </div>
                        <span className="text-xs font-medium">Apple TV</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Data powered by</span>
                    <strong className="text-foreground">JustWatch</strong>
                  </div>
                </div>
              </div>
              <div className="absolute -top-8 -right-8 w-48 h-48 bg-primary/10 rounded-full blur-[60px] -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-t border-b bg-muted/30 pt-16 pb-16">
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
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to discover great content
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed to help you find, organize, and share your favorite entertainment.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative rounded-xl border bg-card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${feature.bg} transition-transform group-hover:scale-110`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
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
            <Link href="/dashboard/playlists" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
              View all →
            </Link>
          </div>
          <div className="overflow-hidden sm:overflow-visible group">
            <CuratedListsCarousel />
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
              {isSignedIn ? (
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/dashboard/profile">
                    Visit Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <SignInButton mode="modal">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </SignInButton>
              )}
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

      <Footer />
    </div>
  );
}
