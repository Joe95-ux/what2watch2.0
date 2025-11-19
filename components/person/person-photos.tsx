"use client";

import { useState } from "react";
import Image from "next/image";
import { getImageUrl } from "@/lib/tmdb";
import MediaModal from "@/components/content-detail/media-modal";

interface PersonPhotosProps {
  images: Array<{
    file_path: string;
    aspect_ratio: number;
    height: number;
    width: number;
  }>;
  personName: string;
}

export default function PersonPhotos({ images, personName }: PersonPhotosProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-6">Photos</h2>
        <p className="text-muted-foreground">No photos available.</p>
      </section>
    );
  }

  const mediaItems = images.map((image) => ({
    type: "image" as const,
    data: { file_path: image.file_path },
  }));

  return (
    <>
      <section>
        <h2 className="text-2xl font-bold mb-6">Photos ({images.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image, index) => (
            <div
              key={image.file_path}
              className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted cursor-pointer group hover:scale-105 transition-transform"
              onClick={() => setSelectedImageIndex(index)}
            >
              <Image
                src={getImageUrl(image.file_path, "w500")}
                alt={`${personName} - Photo ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      </section>

      {selectedImageIndex !== null && (
        <MediaModal
          items={mediaItems}
          initialIndex={selectedImageIndex}
          isOpen={selectedImageIndex !== null}
          onClose={() => setSelectedImageIndex(null)}
          title={personName}
        />
      )}
    </>
  );
}

