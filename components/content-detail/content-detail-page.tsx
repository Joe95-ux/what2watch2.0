"use client";

import { useState, useEffect, useRef } from "react";
import { TMDBMovie, TMDBSeries, TMDBVideo } from "@/lib/tmdb";
import {
  useMovieDetails,
  useTVDetails,
  useContentVideos,
  useTVSeasons,
  useTVSeasonDetails,
  useSimilarMovies,
  useSimilarTV,
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
  const { data: similarMovies } = useSimilarMovies(type === "movie" ? item.id : null);
  const { data: similarTV } = useSimilarTV(type === "tv" ? item.id : null);

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

  // Get cast from details (with type assertion for credits)
  const detailsWithExtras = details as DetailsWithCredits | null;
  const cast = detailsWithExtras?.credits?.cast?.slice(0, 20) || [];

  // Get images from details (with type assertion for images)
  const images = detailsWithExtras?.images;
  const backdrops = images?.backdrops || [];
  const posters = images?.posters || [];
  const stills = images?.stills || [];

  // Get similar content
  const moreLikeThisItems = type === "movie"
    ? (similarMovies?.results || [])
    : (similarTV?.results || []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="w-full h-screen" />
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
      />

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {activeTab === "overview" && (
          <>
            <OverviewSection item={item} type={type} details={details ?? null} cast={cast} />
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
          <CastSection cast={cast} isLoading={false} />
        )}
        {activeTab === "reviews" && (
          <ReviewsSection tmdbId={item.id} mediaType={type} />
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

