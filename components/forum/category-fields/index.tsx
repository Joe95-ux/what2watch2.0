"use client";

import { BugReportFields } from "./bug-report-fields";
import { FeatureRequestFields } from "./feature-request-fields";
import { PlaylistFields } from "./playlist-fields";
import { ListFields } from "./list-fields";
import { WatchlistFields } from "./watchlist-fields";

interface CategoryFieldsProps {
  categorySlug?: string;
  metadata: Record<string, any>;
  onChange: (metadata: Record<string, any>) => void;
}

/**
 * Renders category-specific form fields based on the selected category
 * Category slugs are matched to determine which fields to show
 */
export function CategoryFields({ categorySlug, metadata, onChange }: CategoryFieldsProps) {
  // Map category slugs to their field components
  // These slugs should match the ones in your database
  const getCategoryFields = () => {
    if (!categorySlug) return null;

    const slug = categorySlug.toLowerCase();

    // Bug Report / Help & Support
    if (slug === "bug-report" || slug === "help-support" || slug === "help-&-support") {
      return <BugReportFields metadata={metadata} onChange={onChange} />;
    }

    // Feature Request / Feedback
    if (slug === "feature-request" || slug === "feedback" || slug === "feature-requests") {
      return <FeatureRequestFields metadata={metadata} onChange={onChange} />;
    }

    // Playlists
    if (slug === "playlists" || slug === "playlists-lists" || slug === "playlists-&-lists") {
      return <PlaylistFields metadata={metadata} onChange={onChange} />;
    }

    // Lists
    if (slug === "lists" || slug === "curated-lists") {
      return <ListFields metadata={metadata} onChange={onChange} />;
    }

    // Watchlists
    if (slug === "watchlists" || slug === "watchlist") {
      return <WatchlistFields metadata={metadata} onChange={onChange} />;
    }

    // Default: no additional fields
    return null;
  };

  const fields = getCategoryFields();

  if (!fields) return null;

  return <div className="mt-4">{fields}</div>;
}

