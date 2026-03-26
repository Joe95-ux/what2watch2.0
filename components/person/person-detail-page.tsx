"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePersonDetails, usePersonImages, usePersonMovieCredits, usePersonTVCredits } from "@/hooks/use-person-details";
import { getPosterUrl, getImageUrl } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import PersonBiography from "./person-biography";
import PersonPhotos from "./person-photos";
import PersonKnownFor from "./person-known-for";
import PersonPersonalInfo from "./person-personal-info";
import PersonCreditsTable from "./person-credits-table";
import PersonHeroSection from "./person-hero-section";
import { cn } from "@/lib/utils";

interface PersonDetailPageProps {
  personId: number;
}

export default function PersonDetailPage({ personId }: PersonDetailPageProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"overview" | "photos" | "known-for" | "credits">("overview");
  const { data: person, isLoading: isLoadingPerson } = usePersonDetails(personId);
  const { data: images, isLoading: isLoadingImages } = usePersonImages(personId);
  const { data: movieCredits, isLoading: isLoadingMovieCredits } = usePersonMovieCredits(personId);
  const { data: tvCredits, isLoading: isLoadingTVCredits } = usePersonTVCredits(personId);

  const isLoading = isLoadingPerson || isLoadingImages || isLoadingMovieCredits || isLoadingTVCredits;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back + title */}
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
          <Skeleton className="h-9 w-64 mb-4" />

          {/* Hero skeleton */}
          {isMobile ? (
            <div className="flex flex-col md:flex-row gap-8 mb-10">
              <Skeleton className="w-64 h-96 rounded-lg" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-6 w-48" />
                <div className="flex flex-wrap gap-4">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_300px] mb-10">
              <Skeleton className="hidden lg:block h-[414px] rounded-lg" />
              <Skeleton className="h-[414px] rounded-lg" />
              <Skeleton className="hidden lg:block h-[414px] rounded-lg" />
            </div>
          )}

          {/* Tabs skeleton */}
          <div className="flex items-center gap-2 mb-8">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>

          {/* Overview content skeleton */}
          <div className="space-y-10">
            <div className="space-y-3">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Person not found</p>
      </div>
    );
  }

  const profileImage = person.profile_path
    ? getPosterUrl(person.profile_path, "w500")
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero / Header */}
      <div>
        {isMobile ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-6 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                {profileImage ? (
                  <div className="relative w-64 h-96 rounded-lg overflow-hidden">
                    <Image
                      src={profileImage}
                      alt={person.name}
                      fill
                      className="object-cover"
                      priority
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-64 h-96 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-4xl font-bold text-muted-foreground">
                      {person.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-4">{person.name}</h1>
                {person.known_for_department && (
                  <p className="text-lg text-muted-foreground mb-6">
                    {person.known_for_department}
                  </p>
                )}

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-6 mb-6">
                  {person.birthday && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(person.birthday).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        {person.deathday &&
                          ` - ${new Date(person.deathday).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}`}
                      </span>
                    </div>
                  )}
                  {person.place_of_birth && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{person.place_of_birth}</span>
                    </div>
                  )}
                  {person.homepage && (
                    <a
                      href={person.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 cursor-pointer"
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span>Website</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <PersonHeroSection
            person={person}
            profileImage={profileImage}
            movieCredits={movieCredits ?? null}
            tvCredits={tvCredits ?? null}
            onBack={() => router.back()}
          />
        )}
      </div>

      {/* Content Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full">
          <div className="overflow-x-auto scrollbar-hide mb-8 -mx-2 px-2">
            <div className="min-w-fit flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "h-9 rounded-full px-4 cursor-pointer border-0",
                  activeTab === "overview"
                    ? "bg-muted text-foreground hover:bg-muted"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                Overview
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("photos")}
                className={cn(
                  "h-9 rounded-full px-4 cursor-pointer border-0",
                  activeTab === "photos"
                    ? "bg-muted text-foreground hover:bg-muted"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                Photos
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("known-for")}
                className={cn(
                  "h-9 rounded-full px-4 cursor-pointer border-0",
                  activeTab === "known-for"
                    ? "bg-muted text-foreground hover:bg-muted"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                Known For
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("credits")}
                className={cn(
                  "h-9 rounded-full px-4 cursor-pointer border-0",
                  activeTab === "credits"
                    ? "bg-muted text-foreground hover:bg-muted"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                Credits
              </Button>
            </div>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-12">
            <PersonBiography biography={person.biography} />
            <PersonPersonalInfo person={person} />
            </div>
          )}

          {activeTab === "photos" && (
            <div>
            <PersonPhotos images={images?.profiles || []} personName={person.name} />
            </div>
          )}

          {activeTab === "known-for" && (
            <div>
            <PersonKnownFor
              movieCredits={movieCredits}
              tvCredits={tvCredits}
              knownForDepartment={person.known_for_department}
            />
            </div>
          )}

          {activeTab === "credits" && (
            <div>
            <PersonCreditsTable
              movieCredits={movieCredits}
              tvCredits={tvCredits}
            />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

