"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, TrendingUp, Heart, Star } from "lucide-react";

interface RecommendationBadgeProps {
  reason: string;
  matchScore?: number;
  className?: string;
}

export default function RecommendationBadge({
  reason,
  matchScore,
  className,
}: RecommendationBadgeProps) {
  const getIcon = () => {
    if (reason.toLowerCase().includes("highly") || reason.toLowerCase().includes("rated")) {
      return <Star className="h-3 w-3" />;
    }
    if (reason.toLowerCase().includes("popular") || reason.toLowerCase().includes("trending")) {
      return <TrendingUp className="h-3 w-3" />;
    }
    if (reason.toLowerCase().includes("perfect") || reason.toLowerCase().includes("recommended")) {
      return <Heart className="h-3 w-3" />;
    }
    return <Sparkles className="h-3 w-3" />;
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs font-normal bg-primary/10 text-primary border-primary/20 hover:bg-primary/15",
        className
      )}
    >
      <span className="flex items-center gap-1">
        {getIcon()}
        <span>{reason}</span>
        {matchScore !== undefined && matchScore > 8 && (
          <span className="ml-1 text-primary/70">({Math.round(matchScore * 10) / 10})</span>
        )}
      </span>
    </Badge>
  );
}

