"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook to detect when an element enters the viewport using Intersection Observer
 * Useful for lazy loading content below the fold
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          // Optionally disconnect after first intersection to prevent re-triggering
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before element enters viewport
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, isIntersecting];
}

