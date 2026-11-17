"use client";

import { useQuery } from "@tanstack/react-query";

const MAX_CONCURRENT = 4;
let active = 0;
const waiters: Array<() => void> = [];

function acquire(signal?: AbortSignal) {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const start = () => {
      signal?.removeEventListener("abort", onAbort);
      active += 1;
      resolve();
    };
    const onAbort = () => {
      const index = waiters.indexOf(start);
      if (index >= 0) waiters.splice(index, 1);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    waiters.push(start);
  });
}

function release() {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

export type DisplayRating = {
  rating: number | null;
  source: "imdb" | "tmdb" | null;
} | null;

/** IMDb/TMDB display rating. Off-screen callers should pass enabled=false. In-flight calls are capped. */
export function useDisplayRating(
  tmdbId: number | null | undefined,
  type: "movie" | "tv",
  enabled = true
) {
  return useQuery({
    queryKey: ["imdb-rating-by-tmdb", tmdbId, type],
    queryFn: async ({ signal }) => {
      if (!tmdbId) return null;
      await acquire(signal);
      try {
        const response = await fetch(
          `/api/imdb-rating-by-tmdb?tmdbId=${tmdbId}&type=${type}`,
          { signal }
        );
        if (!response.ok) return null;
        return (await response.json()) as DisplayRating;
      } finally {
        release();
      }
    },
    enabled: Boolean(tmdbId) && enabled,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
