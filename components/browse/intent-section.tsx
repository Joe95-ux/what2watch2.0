"use client";

import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useIntentRecommendations, IntentType } from "@/hooks/use-intent-recommendations";
import ContentRow from "./content-row";
import RecommendationBadge from "./recommendation-badge";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

interface IntentSectionProps {
  intent: IntentType;
  title: string;
  description?: string;
  favoriteGenres: number[];
  preferredTypes: ("movie" | "tv")[];
  icon?: React.ReactNode;
}

export default function IntentSection({
  intent,
  title,
  description,
  favoriteGenres,
  preferredTypes,
  icon,
}: IntentSectionProps) {
  const [ref, isIntersecting] = useIntersectionObserver();
  const { data: recommendations = [], isLoading } = useIntentRecommendations(
    intent,
    favoriteGenres,
    preferredTypes,
    isIntersecting // Only fetch when section is about to enter viewport
  );

  // Extract items and reasons
  const items = recommendations.map((rec) => rec.item);
  const reasons = new Map<string, string>();
  const matchScores = new Map<string, number>();
  
  recommendations.forEach((rec) => {
    const type = "title" in rec.item ? "movie" : "tv";
    const key = `${type}-${rec.item.id}`;
    reasons.set(key, rec.reason);
    if (rec.matchScore !== undefined) {
      matchScores.set(key, rec.matchScore);
    }
  });

  // Determine type (prefer first preferred type, or default to movie)
  const type = preferredTypes.length > 0 ? preferredTypes[0] : "movie";

  return (
    <div ref={ref} className="mb-12">
      <div className="px-4 sm:px-6 lg:px-8 mb-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h2 className="text-2xl font-medium text-foreground">{title}</h2>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      
      {isLoading ? (
        <div className="mb-12 px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-48 bg-muted rounded mb-6 animate-pulse" />
          <div className="relative">
            <div className="overflow-x-hidden">
              <div className="flex gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[180px] sm:w-[200px] aspect-[2/3] bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : items.length > 0 ? (
        <ContentRow
          title=""
          items={items}
          type={type}
          isLoading={false}
        />
      ) : null}
    </div>
  );
}

