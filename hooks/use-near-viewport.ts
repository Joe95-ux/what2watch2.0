"use client";

import { useEffect, useState, type RefCallback } from "react";

/** True once the node is within `rootMargin` of the viewport. Stays true after the first hit. */
export function useNearViewport<T extends Element>(rootMargin = "300px") {
  const [node, setNode] = useState<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near || !node) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near, node, rootMargin]);

  return { ref: setNode as RefCallback<T>, near };
}
