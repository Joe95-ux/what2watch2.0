"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { TMDBPersonMovieCredits, TMDBPersonTVCredits, TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import MoreLikeThisCard from "@/components/browse/more-like-this-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface PersonKnownForProps {
  movieCredits: TMDBPersonMovieCredits | null | undefined;
  tvCredits: TMDBPersonTVCredits | null | undefined;
  knownForDepartment: string;
}

export default function PersonKnownFor({
  movieCredits,
  tvCredits,
  knownForDepartment,
}: PersonKnownForProps) {
  const router = useRouter();

  // Get top rated movies and TV shows, convert to TMDBMovie/TMDBSeries format
  const knownFor = useMemo(() => {
    const items: Array<TMDBMovie | TMDBSeries> = [];

    // Add top movies
    if (movieCredits?.cast) {
      const topMovies: TMDBMovie[] = movieCredits.cast
        .filter((m) => m.vote_average > 0 && m.poster_path)
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 8)
        .map((m) => ({
          id: m.id,
          title: m.title,
          overview: "",
          poster_path: m.poster_path,
          backdrop_path: m.backdrop_path,
          release_date: m.release_date,
          vote_average: m.vote_average,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          adult: false,
          original_language: "en",
          original_title: m.title,
        }));
      items.push(...topMovies);
    }

    // Add top TV shows
    if (tvCredits?.cast) {
      const topTV: TMDBSeries[] = tvCredits.cast
        .filter((t) => t.vote_average > 0 && t.poster_path)
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 8)
        .map((t) => ({
          id: t.id,
          name: t.name,
          overview: "",
          poster_path: t.poster_path,
          backdrop_path: t.backdrop_path,
          first_air_date: t.first_air_date,
          vote_average: t.vote_average,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          original_language: "en",
          original_name: t.name,
        }));
      items.push(...topTV);
    }

    // Sort by rating and take top 12
    return items.sort((a, b) => b.vote_average - a.vote_average).slice(0, 12);
  }, [movieCredits, tvCredits]);

  if (knownFor.length === 0) {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-6">Known For</h2>
        <p className="text-muted-foreground">No known credits available.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-2xl font-bold mb-6">Known For</h2>
      <div className="relative group/carousel">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 5,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 2 },
              "(max-width: 1024px)": { slidesToScroll: 3 },
              "(max-width: 1280px)": { slidesToScroll: 4 },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4 gap-3">
            {knownFor.map((item) => {
              const itemType = "title" in item ? "movie" : "tv";
              return (
                <CarouselItem key={item.id} className="pl-2 md:pl-4 basis-[180px] sm:basis-[200px]">
                  <MoreLikeThisCard
                    item={item}
                    type={itemType}
                    onItemClick={(item, itemType) => {
                      router.push(`/${itemType}/${item.id}`);
                    }}
                    showTypeBadge={true}
                  />
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious 
            className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
          <CarouselNext 
            className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
        </Carousel>
      </div>
    </section>
  );
}

