"use client";

import { useState } from "react";
import Image from "next/image";
import { getImageUrl } from "@/lib/tmdb";
import MediaModal from "@/components/content-detail/media-modal";

interface ImagesSectionProps {
  images: {
    backdrops?: Array<{ file_path: string }>;
    posters?: Array<{ file_path: string }>;
    stills?: Array<{ file_path: string }>;
  };
  title: string;
}

export default function ImagesSection({ images, title }: ImagesSectionProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Combine all images
  const allImages = [
    ...(images.backdrops || []),
    ...(images.posters || []),
    ...(images.stills || []),
  ].filter((img) => !!img?.file_path);

  if (allImages.length === 0) return null;

  const mediaItems = allImages.map((img) => ({
    type: "image" as const,
    data: { file_path: img.file_path },
  }));

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Images</h3>
        <div className="overflow-x-auto scrollbar-thin">
          <div className="flex gap-3 pb-2">
            {allImages.map((image, index) => (
              <div
                key={image.file_path}
                className="relative flex-shrink-0 w-32 h-20 sm:w-40 sm:h-24 rounded-lg overflow-hidden bg-muted cursor-pointer group hover:scale-105 transition-transform"
                onClick={() => setSelectedImageIndex(index)}
              >
                <Image
                  src={getImageUrl(image.file_path, "w500")}
                  alt={`${title} - Image ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedImageIndex !== null && (
        <MediaModal
          items={mediaItems}
          initialIndex={selectedImageIndex}
          isOpen={selectedImageIndex !== null}
          onClose={() => setSelectedImageIndex(null)}
          title={title}
        />
      )}
    </>
  );
}
