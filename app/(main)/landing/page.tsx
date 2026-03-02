'use client';

import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    Sparkles,
    Users,
    Clapperboard,
    Compass,
    PlayCircle,
    Tv,
    Film,
    CheckCircle2,
    Search
} from "lucide-react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicPlaylists } from "@/hooks/use-playlists";
import { usePublicLists } from "@/components/lists/public-lists-content";
import { FAQAccordion } from "@/components/landing/faq-accordion";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import PlaylistCard from "@/components/browse/playlist-card";
import ListCard from "@/components/browse/list-card";
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

    if (isError || allItems.length === 0) {
        return null;
    }

    return (
        <div className="relative group/carousel">
            <Carousel
                opts={{
                    align: "start",
                    slidesToScroll: 1,
                    breakpoints: {
                        "(max-width: 600px)": { slidesToScroll: 1, dragFree: true },
                        "(min-width: 601px)": { slidesToScroll: 2 },
                        "(min-width: 1025px)": { slidesToScroll: 3 },
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

export default function LandingPage() {
    const { isSignedIn } = useUser();

    const features = [
        {
            title: "AI-Powered Discovery",
            description: "Get hyper-personalized recommendations that understand exactly what you are in the mood for.",
            icon: Sparkles,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
        },
        {
            title: "Community Curation",
            description: "Follow trusted curators, read engaging reviews, and discover what your friends are hooked on.",
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

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Cinematic Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden border-b">
                {/* Abstract Background Elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] mix-blend-screen opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/50 to-background z-10" />
                </div>

                <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center mt-12 md:mt-0">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/50 backdrop-blur-md px-5 py-2 text-sm font-medium text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                        <Film className="h-4 w-4" />
                        Curate your cinematic universe
                    </div>
                    <h1 className="mb-6 max-w-5xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-8xl leading-none">
                        Your Ultimate <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-purple-500">
                            Watchlist Companion
                        </span>
                    </h1>
                    <p className="mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                        Never ask "what should we watch?" again. Discover, curate, and share the best movies and TV shows across all streaming platforms.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                        {isSignedIn ? (
                            <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-full shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all hover:scale-105" asChild>
                                <Link href="/dashboard">
                                    Go to Dashboard
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        ) : (
                            <SignInButton mode="modal">
                                <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-full shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all hover:scale-105 group">
                                    Start Curating Free
                                    <PlayCircle className="ml-2 h-5 w-5 group-hover:text-white transition-colors" />
                                </Button>
                            </SignInButton>
                        )}
                        <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-14 px-8 rounded-full backdrop-blur-sm bg-background/50 hover:bg-accent border-primary/20" asChild>
                            <Link href="/browse">
                                <Compass className="mr-2 h-5 w-5" />
                                Explore Library
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* JustWatch Availability Section */}
            <section className="py-24 relative overflow-hidden bg-muted/30">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="order-2 lg:order-1 relative">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-card/50 backdrop-blur-sm p-6 lg:p-10 z-10">
                                <div className="flex items-center space-x-4 mb-8">
                                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-inner">
                                        <Tv className="h-8 w-8 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Dune: Part Two</h3>
                                        <p className="text-sm text-muted-foreground">Available to stream now</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Stream (Flatrate)</p>
                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex flex-col items-center gap-2 group cursor-pointer transition-transform hover:-translate-y-1">
                                                <div className="w-14 h-14 rounded-xl bg-black border border-gray-800 flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all">
                                                    <SiNetflix className="w-7 h-7 text-[#E50914]" />
                                                </div>
                                                <span className="text-xs font-medium">Netflix</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2 group cursor-pointer transition-transform hover:-translate-y-1">
                                                <div className="w-14 h-14 rounded-xl bg-[#00A8E1]/10 border border-[#00A8E1]/20 flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_rgba(0,168,225,0.4)] transition-all">
                                                    <SiAmazonprime className="w-7 h-7 text-[#00A8E1]" />
                                                </div>
                                                <span className="text-xs font-medium">Prime Video</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2 group cursor-pointer transition-transform hover:-translate-y-1">
                                                <div className="w-14 h-14 rounded-xl bg-[#5821A8]/10 border border-[#5821A8]/20 flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_rgba(88,33,168,0.4)] transition-all">
                                                    <SiHbo className="w-7 h-7 text-[#5821A8]" />
                                                </div>
                                                <span className="text-xs font-medium">Max</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border/50">
                                        <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Rent / Buy</p>
                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex flex-col items-center gap-2 group cursor-pointer transition-transform hover:-translate-y-1">
                                                <div className="w-14 h-14 rounded-xl bg-white border flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_rgba(0,0,0,0.2)] dark:bg-black dark:border-gray-800 transition-all">
                                                    <SiApple className="w-7 h-7 text-black dark:text-white" />
                                                </div>
                                                <span className="text-xs font-medium">Apple TV</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>Data powered by</span>
                                        <strong className="text-foreground tracking-wide">JustWatch</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative behind card */}
                            <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -z-10" />
                        </div>

                        <div className="order-1 lg:order-2">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm font-medium text-foreground">
                                <Search className="h-4 w-4 text-primary" />
                                Global Availability
                            </div>
                            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
                                Know exactly where to watch.
                            </h2>
                            <p className="text-lg text-muted-foreground mb-8">
                                Stop jumping between streaming apps. <strong>What2Watch</strong> instantly tells you exactly where any movie or show is available to stream, rent, or buy in your country, thanks to our powerful integration with JustWatch.
                            </p>

                            <ul className="space-y-4 mb-8">
                                {[
                                    "Global streaming data across 100+ platforms",
                                    "Filter lists by your subscribed services",
                                    "Find the best price for renting or buying",
                                    "Get alerts when titles arrive on your platforms"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start">
                                        <CheckCircle2 className="h-6 w-6 text-primary mr-3 flex-shrink-0" />
                                        <span className="text-foreground/80">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 border-t">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-6">
                            Designed for Film Lovers
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Powerful features to help you track everything you've watched, and discover everything you want to.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {features.map((feature, i) => (
                            <div key={i} className="group relative rounded-2xl border bg-card p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 group-hover:-rotate-12">
                                    <feature.icon className={`w-32 h-32 ${feature.color}`} />
                                </div>
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-inner ${feature.bg}`}>
                                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Curated Community Carousel Section */}
            <section className="py-24 border-t bg-muted/10 overflow-hidden">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 md:flex items-end justify-between">
                        <div className="max-w-2xl">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                                Explore Community Lists
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Discover collections meticulously curated by the What2Watch community.
                            </p>
                        </div>
                        <Button variant="ghost" className="hidden md:flex items-center gap-2 mt-4" asChild>
                            <Link href="/browse">
                                View All Compilations <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                    </div>

                    <CuratedListsCarousel />

                    <div className="mt-8 flex justify-center md:hidden">
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/browse">View All Compilations</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Final Call to Action */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10" />
                <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                    <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-blue-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }} />
                </div>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-8">
                        Start Your Journey.
                    </h2>
                    <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                        Join thousands of cinephiles discovering, curating, and sharing exactly what they love to watch.
                    </p>
                    <div className="flex justify-center">
                        {isSignedIn ? (
                            <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-[0_0_40px_rgba(var(--primary),0.4)]" asChild>
                                <Link href="/dashboard">Return to Dashboard</Link>
                            </Button>
                        ) : (
                            <SignInButton mode="modal">
                                <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-[0_0_40px_rgba(var(--primary),0.4)] hover:scale-105 transition-transform duration-300">
                                    Create Your Free Account
                                </Button>
                            </SignInButton>
                        )}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="border-t bg-background py-20 sm:py-24">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Frequently Asked Questions
                        </h2>
                    </div>
                    <FAQAccordion />
                </div>
            </section>
        </div>
    );
}
