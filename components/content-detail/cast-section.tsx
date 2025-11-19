"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  episode_count?: number; // For TV shows
}

interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

interface CastSectionProps {
  cast: CastMember[] | undefined;
  crew?: CrewMember[] | undefined;
  isLoading?: boolean;
  type?: "movie" | "tv";
}

export default function CastSection({ cast, crew, isLoading, type = "movie" }: CastSectionProps) {
  const router = useRouter();
  const [showFullCast, setShowFullCast] = useState(false);

  if (isLoading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">{type === "tv" ? "Series Cast" : "Cast & Crew"}</h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-32 text-center">
              <Skeleton className="w-32 h-32 rounded-full mb-3" />
              <Skeleton className="h-4 w-24 mx-auto mb-2" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!cast || cast.length === 0) {
    return null;
  }

  // Group crew by department
  const crewByDepartment = crew?.reduce((acc, member) => {
    if (!acc[member.department]) {
      acc[member.department] = [];
    }
    acc[member.department].push(member);
    return acc;
  }, {} as Record<string, CrewMember[]>) || {};

  // Sort departments (Directing, Writing, Production first)
  const departmentOrder = ["Directing", "Writing", "Production", "Camera", "Sound", "Editing", "Art", "Costume & Make-Up", "Costume & Makeup", "Visual Effects", "Crew", "Lighting"];
  const sortedDepartments = Object.keys(crewByDepartment).sort((a, b) => {
    const aIndex = departmentOrder.indexOf(a);
    const bIndex = departmentOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Show first 20 cast members in carousel
  const displayedCast = cast.slice(0, 20);
  const remainingCast = cast.slice(20);

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">{type === "tv" ? "Series Cast" : "Cast & Crew"}</h2>
      <div className="relative group/carousel mb-6">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 4,
            breakpoints: {
              "(max-width: 640px)": { slidesToScroll: 2 },
              "(max-width: 1024px)": { slidesToScroll: 3 },
            },
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4 gap-4">
            {displayedCast.map((person) => (
              <CarouselItem key={person.id} className="pl-2 md:pl-4 basis-[140px] sm:basis-[160px]">
                <div 
                  className="text-center group cursor-pointer"
                  onClick={() => router.push(`/person/${person.id}`)}
                >
                  <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                    {person.profile_path ? (
                      <Image
                        src={getPosterUrl(person.profile_path, "w300")}
                        alt={person.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {person.name[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm line-clamp-1">{person.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{person.character}</p>
                  {type === "tv" && person.episode_count && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {person.episode_count} {person.episode_count === 1 ? "episode" : "episodes"}
                    </p>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious 
            className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
          <CarouselNext 
            className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
          />
        </Carousel>
      </div>

      {/* See full cast and crew link */}
      {(remainingCast.length > 0 || (crew && crew.length > 0)) && (
        <div className="mb-8">
          <button
            onClick={() => setShowFullCast(!showFullCast)}
            className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            {showFullCast ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide full cast and crew
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                See full cast and crew
              </>
            )}
          </button>
        </div>
      )}

      {/* Full Cast and Crew Section */}
      {showFullCast && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Cast Column */}
          <div>
            <h3 className="text-xl font-bold mb-4">Cast {cast.length > 0 && `(${cast.length})`}</h3>
            <div className="space-y-4">
              {cast.map((person) => (
                <div 
                  key={person.id} 
                  className="flex items-start gap-4 cursor-pointer hover:bg-muted/20 p-2 rounded-lg transition-colors"
                  onClick={() => router.push(`/person/${person.id}`)}
                >
                  <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                    {person.profile_path ? (
                      <Image
                        src={getPosterUrl(person.profile_path, "w300")}
                        alt={person.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {person.name[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.character}</p>
                    {type === "tv" && person.episode_count && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {person.episode_count} {person.episode_count === 1 ? "episode" : "episodes"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Crew Column */}
          {crew && crew.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-4">Crew ({crew.length})</h3>
              <div className="space-y-6">
                {sortedDepartments.map((department) => (
                  <div key={department}>
                    <h4 className="text-base font-semibold mb-3 text-muted-foreground">{department}</h4>
                    <div className="space-y-3">
                      {crewByDepartment[department].map((member) => (
                        <div 
                          key={`${member.id}-${member.job}`} 
                          className="flex items-start gap-4 cursor-pointer hover:bg-muted/20 p-2 rounded-lg transition-colors"
                          onClick={() => router.push(`/person/${member.id}`)}
                        >
                          <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                            {member.profile_path ? (
                              <Image
                                src={getPosterUrl(member.profile_path, "w300")}
                                alt={member.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {member.name[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.job}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

