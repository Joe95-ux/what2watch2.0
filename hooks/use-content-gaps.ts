import { useQuery } from "@tanstack/react-query";

export interface ContentGap {
  id: string;
  keyword: string;
  category?: string;
  searchVolume: number;
  videoCount: number;
  avgVideoAge: number;
  topVideoViews: string;
  gapScore: number;
  trendScore: number;
  discoveredAt: Date;
}

interface ContentGapsResponse {
  gaps: ContentGap[];
  total: number;
  message?: string;
}

async function fetchContentGaps(
  category?: string,
  limit: number = 20,
  minScore: number = 0
): Promise<ContentGapsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    minScore: minScore.toString(),
  });
  if (category) {
    params.set("category", category);
  }

  const response = await fetch(`/api/youtube/gaps?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch content gaps");
  }
  return response.json();
}

async function detectContentGaps(
  category?: string,
  limit: number = 20
): Promise<ContentGapsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
  });
  if (category) {
    params.set("category", category);
  }

  const response = await fetch(`/api/youtube/gaps/detect?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to detect content gaps");
  }
  const data = await response.json();
  // Handle case where API returns message instead of gaps
  if (data.message && (!data.gaps || data.gaps.length === 0)) {
    return { gaps: [], total: 0 };
  }
  return data;
}

export function useContentGaps(
  category?: string,
  limit: number = 20,
  minScore: number = 0,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["content-gaps", category, limit, minScore],
    queryFn: () => fetchContentGaps(category, limit, minScore),
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useDetectContentGaps(
  category?: string,
  limit: number = 20,
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ["detect-content-gaps", category, limit],
    queryFn: () => detectContentGaps(category, limit),
    enabled,
    staleTime: 0, // Don't cache detection results
  });
}
