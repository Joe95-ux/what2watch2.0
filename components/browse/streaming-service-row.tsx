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

  return (
    <ContentRow
      title={provider.provider_name}
      items={items}
      type="movie"
      isLoading={isLoading}
      viewAllHref={viewAllHref}
    />
  );
}
