"use client";

import Image from "next/image";
import { useState } from "react";
import { getPosterUrl } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PhotosSectionProps {
  backdrops: Array<{ file_path: string }> | undefined;
  posters: Array<{ file_path: string }> | undefined;
  stills: Array<{ file_path: string }> | undefined;
  isLoading?: boolean;
}

type PhotoType = "backdrops" | "posters" | "stills";

export default function PhotosSection({ backdrops, posters, stills, isLoading }: PhotosSectionProps) {
  const [selectedType, setSelectedType] = useState<PhotoType>("backdrops");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-6">Photos</h2>
        <Skeleton className="aspect-video rounded-lg mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  const photos = {
    backdrops: backdrops || [],
    posters: posters || [],
    stills: stills || [],
  };

  const currentPhotos = photos[selectedType];
  const featuredPhoto = currentPhotos[0];

  if (currentPhotos.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <h2 className="text-2xl font-bold">Photos</h2>
        <div className="flex gap-2">
          <Button
            variant={selectedType === "backdrops" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("backdrops")}
          >
            Backdrops ({photos.backdrops.length})
          </Button>
          <Button
            variant={selectedType === "posters" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("posters")}
          >
            Posters ({photos.posters.length})
          </Button>
          <Button
            variant={selectedType === "stills" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("stills")}
          >
            Stills ({photos.stills.length})
          </Button>
        </div>
      </div>

      {/* Featured Image */}
      {featuredPhoto && (
        <div
          className="relative aspect-video rounded-lg overflow-hidden mb-8 bg-muted cursor-pointer group hover:scale-[1.02] transition-transform"
          onClick={() => setSelectedImage(featuredPhoto.file_path)}
        >
          <Image
            src={getPosterUrl(featuredPhoto.file_path, "original")}
            alt="Featured"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {currentPhotos.slice(1, 13).map((photo, index) => (
          <div
            key={index}
            className="relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer group hover:scale-105 transition-transform"
            onClick={() => setSelectedImage(photo.file_path)}
          >
            <Image
              src={getPosterUrl(photo.file_path, "w500")}
              alt={`Photo ${index + 2}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-7xl p-0">
          {selectedImage && (
            <div className="relative w-full aspect-video">
              <Image
                src={getPosterUrl(selectedImage, "original")}
                alt="Full size"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

