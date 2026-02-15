"use client";

import Image from "next/image";
import { useRef, useState, useMemo, useEffect } from "react";
import { useWatchProviders } from "@/hooks/use-watch-providers";
import { useJustWatchChartWithBatch, type ChartPeriod } from "@/hooks/use-justwatch-chart";
import { StreamingChartRow } from "../streaming-chart-row";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";

const RANK_PERIODS = [
  { id: "24h", label: "24h", apiPeriod: "1d" as ChartPeriod },
  { id: "7d", label: "7d", apiPeriod: "7d" as ChartPeriod },
  { id: "30d", label: "30d", apiPeriod: "30d" as ChartPeriod },
] as const;

export type RankPeriodId = (typeof RANK_PERIODS)[number]["id"];

const PROVIDERS_LIMIT = 20;
const CHART_LIMIT = 20;

interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

function ProviderCombobox({
  providers,
  focusedProviderId,
  onSelect,
  rowRefsMap,
}: {
  providers: WatchProvider[];
  focusedProviderId: number | null;
  onSelect: (providerId: number) => void;
  rowRefsMap: React.RefObject<Record<number, HTMLDivElement | null>>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return providers;
    const q = search.toLowerCase().trim();
    return providers.filter((p) => p.provider_name.toLowerCase().includes(q));
  }, [providers, search]);

  const scrollToProvider = (providerId: number) => {
    const el = rowRefsMap.current?.[providerId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelect = (providerId: number) => {
    onSelect(providerId);
    setOpen(false);
    setSearch("");
    // Scroll after popover closes so ref is still valid and viewport updates correctly
    setTimeout(() => scrollToProvider(providerId), 0);
  };

  const selected = providers.find((p) => p.provider_id === focusedProviderId);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[240px] sm:w-[260px] justify-between cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            {selected?.logo_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w92${selected.logo_path}`}
                alt=""
                className="h-6 w-6 rounded object-cover shrink-0"
              />
            ) : (
              <span className="h-6 w-6 rounded bg-muted shrink-0" />
            )}
            <span className="truncate">{selected?.provider_name ?? "Choose provider"}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false} className="rounded-lg border-0 bg-transparent">
          <CommandInput
            placeholder="Search provider..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            {filtered.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">No provider found.</div>
            )}
            <CommandGroup forceMount className="p-1">
              {filtered.map((p) => {
                const isSelected = focusedProviderId === p.provider_id;
                return (
                  <CommandItem
                    key={p.provider_id}
                    value={`${p.provider_id}-${p.provider_name}`}
                    forceMount
                    onSelect={() => handleSelect(p.provider_id)}
                    className="cursor-pointer gap-2"
                  >
                    {p.logo_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                        alt=""
                        className="h-6 w-6 rounded object-cover shrink-0"
                      />
                    ) : (
                      <span className="h-6 w-6 rounded bg-muted shrink-0" />
                    )}
                    <span className="flex-1 truncate">{p.provider_name}</span>
                    {isSelected && <Check className="size-4 shrink-0" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ProviderRow({
  provider,
  period,
  rowRef,
}: {
  provider: { provider_id: number; provider_name: string; logo_path: string | null };
  period: ChartPeriod;
  rowRef: React.Ref<HTMLDivElement | null>;
}) {
  const { data: entries = [], isLoading } = useJustWatchChartWithBatch(provider.provider_id, {
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

const NETFLIX_PROVIDER_ID = 8; // TMDB watch provider ID for Netflix (US)

export function RankChartsTab() {
  const [periodId, setPeriodId] = useState<RankPeriodId>("24h");
  const [focusedProviderId, setFocusedProviderId] = useState<number | null>(null);
  const initialProviderSet = useRef(false);
  const period: ChartPeriod = RANK_PERIODS.find((p) => p.id === periodId)?.apiPeriod ?? "1d";
  const { data: providers = [] } = useWatchProviders("US", { limit: PROVIDERS_LIMIT });
  const rowRefsMap = useRef<Record<number, HTMLDivElement | null>>({});

  // Default selected provider to Netflix once providers load
  useEffect(() => {
    if (providers.length === 0 || initialProviderSet.current) return;
    const netflix = providers.find(
      (p) => p.provider_id === NETFLIX_PROVIDER_ID || p.provider_name.toLowerCase().includes("netflix")
    );
    if (netflix) {
      setFocusedProviderId(netflix.provider_id);
      initialProviderSet.current = true;
    }
  }, [providers]);

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
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          <Image
            src="/jw-icon.png"
            alt="JustWatch"
            width={20}
            height={20}
            className="object-contain"
            unoptimized
          />
          JustWatch Streaming Charts
        </h2>
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

      {/* Go to provider: same pattern as country dropdown on details page */}
      {providers.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Go to provider:</span>
          <ProviderCombobox
            providers={providers}
            focusedProviderId={focusedProviderId}
            onSelect={setFocusedProviderId}
            rowRefsMap={rowRefsMap}
          />
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
