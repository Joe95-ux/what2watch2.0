"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { TMDBGenre, TMDBMovie } from "@/lib/tmdb";
import { getPosterUrl } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";

interface GenreSelectionProps {
  selectedGenres: number[];
  onGenresChange: (genres: number[]) => void;
}

interface GenreWithMovie extends TMDBGenre {
  sampleMovie?: TMDBMovie;
}

export default function GenreSelection({ selectedGenres, onGenresChange }: GenreSelectionProps) {
  const [genres, setGenres] = useState<GenreWithMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        // Fetch genres and popular movies in parallel
        const [genresRes, moviesRes] = await Promise.all([
          fetch("/api/genres"),
          fetch("/api/movies/popular?page=1"),
        ]);

        const genresData = await genresRes.json();
        const moviesData = await moviesRes.json();

        if (genresData.all && moviesData.results) {
          // Create a map of genre IDs to movies for quick lookup
          const genreMovieMap = new Map<number, TMDBMovie>();
          
          // For each movie, add it to the map for each of its genres
          moviesData.results.forEach((movie: TMDBMovie) => {
            if (movie.genre_ids && movie.backdrop_path) {
              movie.genre_ids.forEach((genreId: number) => {
                if (!genreMovieMap.has(genreId)) {
                  genreMovieMap.set(genreId, movie);
                }
              });
            }
          });

          // Match genres with sample movies
          const genresWithMovies: GenreWithMovie[] = genresData.all
            .slice(0, 20)
            .map((genre: TMDBGenre) => ({
              ...genre,
              sampleMovie: genreMovieMap.get(genre.id),
            }));

          setGenres(genresWithMovies);
        }
      } catch (error) {
        console.error("Error fetching genres:", error);
        // Set empty array on error, will show fallback UI
        setGenres([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();
  }, []);

  const toggleGenre = (genreId: number) => {
    if (selectedGenres.includes(genreId)) {
      onGenresChange(selectedGenres.filter((id) => id !== genreId));
    } else {
      onGenresChange([...selectedGenres, genreId]);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {genres.map((genre, index) => {
        const isSelected = selectedGenres.includes(genre.id);
        const bgImage = genre.sampleMovie?.backdrop_path || genre.sampleMovie?.poster_path;

        return (
          <div
            key={genre.id}
            onClick={() => toggleGenre(genre.id)}
            className={cn(
              "relative h-48 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 group animate-in fade-in slide-in-from-bottom-4",
              "hover:scale-105 hover:shadow-2xl hover:z-10",
              isSelected && "ring-4 ring-purple-500 ring-offset-2 scale-105 shadow-2xl z-10"
            )}
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: "both",
            }}
          >
            {/* Background Image */}
            {bgImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{
                  backgroundImage: `url(${getPosterUrl(bgImage, "w500")})`,
                }}
              >
                {/* Dimmed Overlay */}
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-300",
                    isSelected
                      ? "bg-gradient-to-t from-[#066f72]/90 via-[#066f72]/70 to-[#0d9488]/50"
                      : "bg-gradient-to-t from-black/80 via-black/60 to-black/40 group-hover:from-black/70 group-hover:via-black/50 group-hover:to-black/30"
                  )}
                />
              </div>
            ) : (
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-300",
                  isSelected
                    ? "bg-gradient-to-br from-[#066f72] to-[#0d9488]"
                    : "bg-gradient-to-br from-gray-700 to-gray-900"
                )}
              />
            )}

            {/* Genre Name and Check */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
              <div className="text-center">
                <h3
                  className={cn(
                    "font-bold text-lg mb-2 transition-colors",
                    isSelected ? "text-white" : "text-white/90"
                  )}
                >
                  {genre.name}
                </h3>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gradient-to-r from-[#066f72] to-[#0d9488] flex items-center justify-center animate-in zoom-in duration-300">
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#066f72] to-[#0d9488]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
