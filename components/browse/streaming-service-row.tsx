"use client";

import ContentRow from "./content-row";
import { useSearch } from "@/hooks/use-search";
import type { WatchProvider } from "@/hooks/use-watch-providers";

const WATCH_REGION = "US";

interface StreamingServiceRowProps {
  provider: WatchProvider;
}

export default function StreamingServiceRow({ provider }: StreamingServiceRowProps) {
  const { data, isLoading } = useSearch({
    watchProvider: provider.provider_id,
    watchRegion: WATCH_REGION,
    type: "all",
    page: 1,
  });

  const items = data?.results ?? [];
  const viewAllHref = `/search?watchProvider=${provider.provider_id}`;

  const titlePrefix = provider.logo_path ? (
    <img
      src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
      alt=""
      className="h-8 w-8 rounded-lg object-cover shrink-0"
    />
  ) : null;

  return (
    <ContentRow
      title={provider.provider_name}
      items={items}
      type="movie"
      isLoading={isLoading}
      viewAllHref={viewAllHref}
      titlePrefix={titlePrefix}
    />
  );
}
