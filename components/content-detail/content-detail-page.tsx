"use client";

import { useState, useEffect, useRef } from "react";
import { TMDBMovie, TMDBSeries, TMDBVideo } from "@/lib/tmdb";
import {
  useMovieDetails,
  useTVDetails,
  useContentVideos,
  useTVSeasons,
  useTVSeasonDetails,
  useRecommendedMovies,
  useRecommendedTV,
  useWatchProviders,
} from "@/hooks/use-content-details";
import HeroSection from "./hero-section";
import StickyNav from "./sticky-nav";
import OverviewSection from "./overview-section";
import CastSection from "./cast-section";
import ReviewsSection from "./reviews-section";
import VideosSection from "./videos-section";
import PhotosSection from "./photos-section";
import TVSeasonsSection from "./tv-seasons-section";
import MoreLikeThisSection from "./more-like-this-section";
import RecentlyViewedSection from "./recently-viewed-section";
import WatchBreakdownSection from "./watch-breakdown-section";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentDetailPageProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
}

interface DetailsWithCredits {
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
      episode_count?: number; // For TV shows
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
      profile_path: string | null;
    }>;
  };
  images?: {
    backdrops?: Array<{ file_path: string }>;
    posters?: Array<{ file_path: string }>;
    stills?: Array<{ file_path: string }>;
  };
}

export default function ContentDetailPage({ item, type }: ContentDetailPageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Fetch details
  const { data: movieDetails, isLoading: isLoadingMovie } = useMovieDetails(
    type === "movie" ? item.id : null
  );
  const { data: tvDetails, isLoading: isLoadingTV } = useTVDetails(
    type === "tv" ? item.id : null
  );
  const { data: videosData } = useContentVideos(type, item.id);
  const { data: seasonsData } = useTVSeasons(type === "tv" ? item.id : null);
  const { data: seasonDetails, isLoading: isLoadingSeasonDetails } = useTVSeasonDetails(
    type === "tv" ? item.id : null,
    selectedSeason
  );
  const { data: recommendedMovies } = useRecommendedMovies(type === "movie" ? item.id : null);
  const { data: recommendedTV } = useRecommendedTV(type === "tv" ? item.id : null);
  const {
    data: watchAvailability,
    isLoading: isLoadingWatchAvailability,
  } = useWatchProviders(type, item.id);

  const details = type === "movie" ? movieDetails : tvDetails;
  const isLoading = type === "movie" ? isLoadingMovie : isLoadingTV;

  // Find trailer
  const trailer = videosData?.results?.find(
    (v: TMDBVideo) => v.type === "Trailer" && v.site === "YouTube"
  ) || null;

  // Track scroll for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-select first season for TV
  useEffect(() => {
    if (type === "tv" && seasonsData && seasonsData.seasons.length > 0 && selectedSeason === null) {
      const firstRegularSeason = seasonsData.seasons.find((s) => s.season_number > 0);
      if (firstRegularSeason) {
        setSelectedSeason(firstRegularSeason.season_number);
      }
    }
  }, [type, seasonsData, selectedSeason]);

  // Get cast and crew from details (with type assertion for credits)
  const detailsWithExtras = details as DetailsWithCredits | null;
  const cast = detailsWithExtras?.credits?.cast || [];
  const crew = detailsWithExtras?.credits?.crew || [];

  // Get images from details (with type assertion for images)
  const images = detailsWithExtras?.images;
  const backdrops = images?.backdrops || [];
  const posters = images?.posters || [];
  const stills = images?.stills || [];

  // Get recommended content
  const moreLikeThisItems = type === "movie"
    ? (recommendedMovies?.results || [])
    : (recommendedTV?.results || []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section Skeleton */}
        <div className="-mt-[65px] pt-16 sm:pt-20 pb-12 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-end gap-3 mt-[14px] md:mt-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-6 w-px" />
                <Skeleton className="h-9 w-20 rounded-full" />
              </div>
              <div className="flex flex-col sm:flex-row justify-start sm:justify-between sm:items-center gap-3">
                <Skeleton className="h-8 w-64" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_200px]">
              {/* Poster Skeleton */}
              <div className="hidden lg:block">
                <Skeleton className="aspect-[2/3] rounded-lg" />
              </div>
              {/* Banner Skeleton */}
              <div className="relative rounded-lg overflow-hidden min-h-[260px]">
                <Skeleton className="w-full h-full" />
              </div>
              {/* Stats Skeleton */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Nav Skeleton */}
        <div className="sticky top-[65px] z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-6 overflow-x-auto">
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-24" />
            </div>
          </div>
        </div>

        {/* Content Sections Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-6">
              {/* Genres Skeleton */}
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
              {/* Storyline Skeleton */}
              <div>
                <Skeleton className="h-7 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              {/* Info Card Skeleton */}
              <div className="rounded-2xl border border-border bg-card/50 divide-y divide-border">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
              {/* Details Grid Skeleton */}
              <div>
                <Skeleton className="h-7 w-32 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 space-y-4">
              {/* Watch Providers Skeleton */}
              <div>
                <Skeleton className="h-7 w-40 mb-6" />
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div ref={heroRef}>
        <HeroSection
          item={item}
          type={type}
          details={details ?? null}
          trailer={trailer}
          videosData={videosData || null}
        />
      </div>

      {/* Sticky Navigation */}
      <StickyNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isScrolled={isScrolled}
        type={type}
      />

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {activeTab === "overview" && (
          <>
            <OverviewSection
              item={item}
              type={type}
              details={details ?? null}
              cast={cast}
              watchAvailability={watchAvailability}
              isWatchLoading={isLoadingWatchAvailability}
            />
            {/* TV Seasons - Show in overview for TV */}
            {type === "tv" && seasonsData && (
              <TVSeasonsSection
                seasons={seasonsData.seasons}
                selectedSeason={selectedSeason}
                onSeasonSelect={setSelectedSeason}
                seasonDetails={seasonDetails}
                isLoadingSeasonDetails={isLoadingSeasonDetails}
              />
            )}
            {/* More Like This */}
            <MoreLikeThisSection
              items={moreLikeThisItems}
              type={type}
              isLoading={false}
            />
            <div className="border-t border-border my-12" />
            {/* Recently Viewed */}
            <RecentlyViewedSection currentItemId={item.id} currentType={type} />
          </>
        )}
        {activeTab === "cast" && (
          <CastSection cast={cast} crew={crew} isLoading={false} type={type} />
        )}
        {activeTab === "watch" && (
          <WatchBreakdownSection
            availability={watchAvailability}
            isLoading={isLoadingWatchAvailability}
          />
        )}
        {activeTab === "reviews" && (
          <ReviewsSection
            tmdbId={item.id}
            mediaType={type}
            filmData={{
              title: type === "movie" ? (item as TMDBMovie).title : (item as TMDBSeries).name,
              posterPath: item.poster_path,
              releaseYear:
                type === "movie"
                  ? details && "release_date" in details && details.release_date
                    ? new Date(details.release_date).getFullYear().toString()
                    : null
                  : details && "first_air_date" in details && details.first_air_date
                  ? new Date(details.first_air_date).getFullYear().toString()
                  : null,
              runtime:
                type === "movie"
                  ? details && "runtime" in details && details.runtime
                    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
                    : null
                  : details && "episode_run_time" in details && details.episode_run_time && details.episode_run_time.length > 0
                  ? (() => {
                      const avg = Math.round(
                        details.episode_run_time.reduce((a, b) => a + b, 0) /
                          details.episode_run_time.length
                      );
                      return `${Math.floor(avg / 60)}h ${avg % 60}m`;
                    })()
                  : null,
              rating: item.vote_average > 0 ? item.vote_average : null,
            }}
          />
        )}
        {activeTab === "videos" && (
          <VideosSection
            videos={videosData?.results || []}
            isLoading={false}
            title={type === "movie" ? (item as TMDBMovie).title : (item as TMDBSeries).name}
          />
        )}
        {activeTab === "photos" && (
          <PhotosSection
            backdrops={backdrops}
            posters={posters}
            stills={stills}
            isLoading={false}
          />
        )}
      </div>
    </div>
  );
}

