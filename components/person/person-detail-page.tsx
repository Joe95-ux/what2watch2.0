"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePersonDetails, usePersonImages, usePersonMovieCredits, usePersonTVCredits } from "@/hooks/use-person-details";
import { getPosterUrl, getImageUrl } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon } from "lucide-react";
import PersonBiography from "./person-biography";
import PersonPhotos from "./person-photos";
import PersonKnownFor from "./person-known-for";
import PersonPersonalInfo from "./person-personal-info";
import PersonCreditsTable from "./person-credits-table";

interface PersonDetailPageProps {
  personId: number;
}

export default function PersonDetailPage({ personId }: PersonDetailPageProps) {
  const router = useRouter();
  const { data: person, isLoading: isLoadingPerson } = usePersonDetails(personId);
  const { data: images, isLoading: isLoadingImages } = usePersonImages(personId);
  const { data: movieCredits, isLoading: isLoadingMovieCredits } = usePersonMovieCredits(personId);
  const { data: tvCredits, isLoading: isLoadingTVCredits } = usePersonTVCredits(personId);

  const isLoading = isLoadingPerson || isLoadingImages || isLoadingMovieCredits || isLoadingTVCredits;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-96 w-full mb-8" />
          <Skeleton className="h-64 w-full" />
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
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-6"
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
                      {person.deathday && ` - ${new Date(person.deathday).toLocaleDateString("en-US", {
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
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                  >
                    <LinkIcon className="h-4 w-4" />
                    <span>Website</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="known-for">Known For</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-12">
            <PersonBiography biography={person.biography} />
            <PersonPersonalInfo person={person} />
          </TabsContent>

          <TabsContent value="photos">
            <PersonPhotos images={images?.profiles || []} personName={person.name} />
          </TabsContent>

          <TabsContent value="known-for">
            <PersonKnownFor
              movieCredits={movieCredits}
              tvCredits={tvCredits}
              knownForDepartment={person.known_for_department}
            />
          </TabsContent>

          <TabsContent value="credits">
            <PersonCreditsTable
              movieCredits={movieCredits}
              tvCredits={tvCredits}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

