"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import Script from "next/script";

interface JustWatchWidgetProps {
  imdbId: string | null;
  title: string;
  mediaType: "movie" | "tv";
  className?: string;
  titleClassName?: string;
  onInit?: () => void;
}

export function JustWatchWidget({
  imdbId,
  title,
  mediaType,
  className = "",
  titleClassName = "",
  onInit,
}: JustWatchWidgetProps) {
  const { resolvedTheme } = useTheme();
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const initAttemptsRef = useRef(0);
  const maxAttempts = 10;

  // Initialize widget when imdbId changes
  useEffect(() => {
    if (typeof window !== "undefined" && imdbId && widgetContainerRef.current) {
      const initWidget = () => {
        try {
          const jwWidget = (window as Window & { JW_Widget?: { init: () => void } }).JW_Widget;
          if (jwWidget) {
            // Check if widget container exists
            const widgetContainer = widgetContainerRef.current?.querySelector('[data-jw-widget]');
            if (widgetContainer) {
              jwWidget.init();
              if (onInit) {
                onInit();
              }
            }
          } else {
            // If widget script hasn't loaded yet, wait a bit and try again
            if (initAttemptsRef.current < maxAttempts) {
              initAttemptsRef.current++;
              setTimeout(initWidget, 100);
            }
          }
        } catch (error) {
          console.error("Error initializing JustWatch widget:", error);
        }
      };
      
      // Delay initialization to ensure DOM is ready
      const timeoutId = setTimeout(initWidget, 500);
      return () => {
        clearTimeout(timeoutId);
        initAttemptsRef.current = 0;
      };
    }
  }, [imdbId, mediaType, onInit]);

  if (!imdbId) {
    return null;
  }

  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const color = resolvedTheme === "dark" ? "#ffffff" : "#000000";
  const linkColor = resolvedTheme === "dark" ? "white" : "black";
  const justwatchPath = mediaType === "movie" ? "Film" : "Serie";

  return (
    <>
      {/* JustWatch Widget Script */}
      <Script
        src="https://widget.justwatch.com/justwatch_widget.js"
        strategy="afterInteractive"
        id="justwatch-widget-script"
      />
      <div ref={widgetContainerRef} className={className}>
        <div
          data-jw-widget
          data-api-key="kdXlICVx4d6qwyZYSThFxvVKAhQtwtqY"
          data-object-type={mediaType === "movie" ? "movie" : "show"}
          data-id={imdbId}
          data-id-type="imdb"
          data-offer-label="price"
          data-no-offers-message={`Oopsy daisy, no offers for ${title} at this time!`}
          data-title-not-found-message="Oopsy daisy, no offers at this time!"
          data-theme={theme}
          data-color={color}
        />
        <div className="mt-2">
          <a
            style={{
              fontSize: "11px",
              fontFamily: "sans-serif",
              color: linkColor,
              textDecoration: "none",
            }}
            target="_blank"
            href={`https://www.justwatch.com/${justwatchPath}/${encodeURIComponent(title)}`}
            rel="noopener noreferrer"
          >
            Powered by{" "}
            <span
              style={{
                display: "inline-block",
                width: "66px",
                height: "10px",
                marginLeft: "3px",
                background: "url(https://widget.justwatch.com/assets/JW_logo_color_10px.svg)",
                overflow: "hidden",
                textIndent: "-3000px",
              }}
            >
              JustWatch
            </span>
          </a>
        </div>
      </div>
    </>
  );
}

