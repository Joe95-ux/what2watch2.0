"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
}

type ParallaxProps = {
  children: ReactNode;
  /** Positive = moves with scroll direction relative to viewport center; typical 0.08–0.35 */
  speed?: number;
  className?: string;
  style?: CSSProperties;
};

const parallaxListeners = new Set<() => void>();
let parallaxAttached = false;
let parallaxRaf = 0;

function notifyParallax() {
  cancelAnimationFrame(parallaxRaf);
  parallaxRaf = requestAnimationFrame(() => {
    parallaxListeners.forEach((listener) => listener());
  });
}

function subscribeParallax(listener: () => void) {
  parallaxListeners.add(listener);
  if (!parallaxAttached && typeof window !== "undefined") {
    parallaxAttached = true;
    window.addEventListener("scroll", notifyParallax, { passive: true });
    window.addEventListener("resize", notifyParallax, { passive: true });
  }
  listener();
  return () => {
    parallaxListeners.delete(listener);
    if (parallaxListeners.size === 0 && parallaxAttached) {
      parallaxAttached = false;
      cancelAnimationFrame(parallaxRaf);
      window.removeEventListener("scroll", notifyParallax);
      window.removeEventListener("resize", notifyParallax);
    }
  };
}

/** Subtle translateY parallax tied to the element's distance from viewport center. */
export function Parallax({ children, speed = 0.15, className, style }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.style.transform = style?.transform ?? "";
      return;
    }

    return subscribeParallax(() => {
      const rect = el.getBoundingClientRect();
      const viewCenter = window.innerHeight / 2;
      const elCenter = rect.top + rect.height / 2;
      const offset = (elCenter - viewCenter) * speedRef.current;
      el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    });
  }, [reduced, style?.transform]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        willChange: reduced ? undefined : "transform",
      }}
    >
      {children}
    </div>
  );
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Delay in ms after entering view */
  delay?: number;
  /** Vertical travel before settling */
  distance?: number;
};

/** Fade + rise into place when the block enters the viewport. */
export function Reveal({ children, className, delay = 0, distance = 28 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0, 0, 0)" : `translate3d(0, ${distance}px, 0)`,
        transition: reduced
          ? undefined
          : `opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: reduced || visible ? undefined : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
