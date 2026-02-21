"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface JustWatchRecommendation {
  id: string;
  text: string;
  author?: string;
  authorRole?: string;
  source?: string;
}

interface WhyToWatchSectionProps {
  type: "movie" | "tv";
  tmdbId: number;
  country?: string;
}

async function fetchRecommendations(type: "movie" | "tv", tmdbId: number, country: string) {
  const response = await fetch(`/api/justwatch/recommendations/${type}/${tmdbId}?country=${country}`);
  if (!response.ok) return [];
  return (await response.json()) as JustWatchRecommendation[];
}

function RecommendationCard({ recommendation }: { recommendation: JustWatchRecommendation }) {
  return (
    <div className="rounded-2xl border border-border/60 p-4 text-left transition-colors hover:border-primary cursor-pointer h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative h-14 w-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
            <Quote className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {recommendation.author && (
            <p className="font-medium text-sm line-clamp-1 mb-1">{recommendation.author}</p>
          )}
          {recommendation.authorRole && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{recommendation.authorRole}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-foreground line-clamp-4 flex-1">{recommendation.text}</p>
      {recommendation.source && (
        <p className="text-xs text-muted-foreground mt-2">{recommendation.source}</p>
      )}
    </div>
  );
}

export default function WhyToWatchSection({ type, tmdbId, country = "US" }: WhyToWatchSectionProps) {
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["justwatch-recommendations", type, tmdbId, country],
    queryFn: () => fetchRecommendations(type, tmdbId, country),
    enabled: !!tmdbId,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Why to Watch</h2>
          <p className="text-sm text-muted-foreground">Recommendations from critics and editors</p>
        </div>
        <div className="relative group/carousel">
          <Carousel
            opts={{
              align: "start",
              slidesToScroll: 1,
              dragFree: true,
              breakpoints: {
                "(max-width: 640px)": { slidesToScroll: 1, dragFree: true },
                "(min-width: 641px) and (max-width: 768px)": { slidesToScroll: 2, dragFree: true },
                "(min-width: 769px) and (max-width: 1024px)": { slidesToScroll: 3, dragFree: true },
                "(min-width: 1025px)": { slidesToScroll: 4, dragFree: true },
              },
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 sm:-ml-3 md:-ml-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <CarouselItem
                  key={idx}
                  className="pl-2 sm:pl-3 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                >
                  <Skeleton className="h-40 rounded-2xl" />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Why to Watch</h2>
        <p className="text-sm text-muted-foreground">Recommendations from critics and editors</p>
      </div>
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 1,
            dragFree: true,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 1, dragFree: true },
              "(min-width: 641px) and (max-width: 768px)": { slidesToScroll: 2, dragFree: true },
              "(min-width: 769px) and (max-width: 1024px)": { slidesToScroll: 3, dragFree: true },
              "(min-width: 1025px)": { slidesToScroll: 4, dragFree: true },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 sm:-ml-3 md:-ml-4">
            {recommendations.map((recommendation) => (
              <CarouselItem
                key={recommendation.id}
                className="pl-2 sm:pl-3 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <RecommendationCard recommendation={recommendation} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10"
          />
          <CarouselNext
            className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer z-10"
          />
        </Carousel>
      </div>
    </div>
  );
}
