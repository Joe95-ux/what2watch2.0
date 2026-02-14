"use client";

import { useRef, useState } from "react";
import { useWatchProviders } from "@/hooks/use-watch-providers";
import { useJustWatchChart, type ChartPeriod } from "@/hooks/use-justwatch-chart";
import { StreamingChartRow } from "../streaming-chart-row";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const RANK_PERIODS = [
  { id: "24h", label: "24h", apiPeriod: "1d" as ChartPeriod },
  { id: "7d", label: "7d", apiPeriod: "7d" as ChartPeriod },
  { id: "30d", label: "30d", apiPeriod: "30d" as ChartPeriod },
] as const;

export type RankPeriodId = (typeof RANK_PERIODS)[number]["id"];

const PROVIDERS_LIMIT = 20;
const CHART_LIMIT = 15;

function ProviderRow({
  provider,
  period,
  rowRef,
}: {
  provider: { provider_id: number; provider_name: string; logo_path: string | null };
  period: ChartPeriod;
  rowRef: React.Ref<HTMLDivElement | null>;
}) {
  const { data: entries = [], isLoading } = useJustWatchChart(provider.provider_id, {
    country: "US",
    period,
    limit: CHART_LIMIT,
  });
  const logoUrl = provider.logo_path
    ? `https://image.tmdb.org/t/p/w92${provider.logo_path}`
    : null;

  return (
    <StreamingChartRow
      providerName={provider.provider_name}
      providerLogoUrl={logoUrl}
      providerId={provider.provider_id}
      entries={entries}
      isLoading={isLoading}
      rowRef={rowRef}
    />
  );
}

export function RankChartsTab() {
  const [periodId, setPeriodId] = useState<RankPeriodId>("7d");
  const period: ChartPeriod = RANK_PERIODS.find((p) => p.id === periodId)?.apiPeriod ?? "7d";
  const { data: providers = [] } = useWatchProviders("US", { limit: PROVIDERS_LIMIT });
  const rowRefsMap = useRef<Record<number, HTMLDivElement | null>>({});
  const setRowRef = (providerId: number) => (el: HTMLDivElement | null) => {
    rowRefsMap.current[providerId] = el;
  };

  const scrollToProvider = (providerId: number) => {
    const el = rowRefsMap.current[providerId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header: Streaming Charts (left) + Period picker (right) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-foreground">Streaming Charts</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rank period:</span>
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
            {RANK_PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodId(p.id)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer",
                  periodId === p.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jump to provider */}
      {providers.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Go to provider:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
                Choose provider
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[60vh] overflow-y-auto">
              <DropdownMenuLabel>Streaming services</DropdownMenuLabel>
              {providers.map((p) => (
                <DropdownMenuItem
                  key={p.provider_id}
                  onClick={() => scrollToProvider(p.provider_id)}
                  className="cursor-pointer"
                >
                  {p.provider_name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Provider rows: each uses JustWatch chart API (rank + delta for chosen period) */}
      <div>
        {providers.map((provider) => (
          <ProviderRow
            key={provider.provider_id}
            provider={provider}
            period={period}
            rowRef={setRowRef(provider.provider_id)}
          />
        ))}
      </div>
    </div>
  );
}
