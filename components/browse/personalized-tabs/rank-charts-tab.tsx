"use client";

import Image from "next/image";
import { useRef, useState, useMemo, useEffect } from "react";

import { useWatchProviders } from "@/hooks/use-watch-providers";
import {
  useJustWatchChartWithBatch,
  type ChartPeriod,
} from "@/hooks/use-justwatch-chart";

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

const NETFLIX_PROVIDER_ID = 8;

/* ============================================================
   ✅ PROVIDER COMBOBOX (NO SCROLL HERE)
============================================================ */
function ProviderCombobox({
  providers,
  focusedProviderId,
  onSelect,
}: {
  providers: WatchProvider[];
  focusedProviderId: number | null;
  onSelect: (providerId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return providers;
    const q = search.toLowerCase().trim();
    return providers.filter((p) =>
      p.provider_name.toLowerCase().includes(q)
    );
  }, [providers, search]);

  const selected = providers.find(
    (p) => p.provider_id === focusedProviderId
  );

  const handleSelect = (providerId: number) => {
    onSelect(providerId);

    // Close dropdown cleanly
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-[240px] sm:w-[260px] justify-between"
        >
          <span className="flex items-center gap-2 truncate">
            {selected?.logo_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w92${selected.logo_path}`}
                alt=""
                className="h-6 w-6 rounded object-cover"
              />
            ) : (
              <span className="h-6 w-6 rounded bg-muted" />
            )}

            <span className="truncate">
              {selected?.provider_name ?? "Choose provider"}
            </span>
          </span>

          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search provider..."
            value={search}
            onValueChange={setSearch}
          />

          <CommandList className="max-h-[300px]">
            <CommandGroup className="p-1">
              {filtered.map((p) => {
                const isSelected =
                  focusedProviderId === p.provider_id;

                return (
                  <CommandItem
                    key={p.provider_id}
                    onSelect={() => handleSelect(p.provider_id)}
                    className="cursor-pointer flex gap-2"
                  >
                    {p.logo_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                        alt=""
                        className="h-6 w-6 rounded object-cover"
                      />
                    ) : (
                      <span className="h-6 w-6 rounded bg-muted" />
                    )}

                    <span className="flex-1 truncate">
                      {p.provider_name}
                    </span>

                    {isSelected && (
                      <Check className="h-4 w-4" />
                    )}
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

/* ============================================================
   PROVIDER ROW
============================================================ */
function ProviderRow({
  provider,
  period,
  rowRef,
}: {
  provider: WatchProvider;
  period: ChartPeriod;
  rowRef: React.Ref<HTMLDivElement | null>;
}) {
  const { data: entries = [], isLoading } =
    useJustWatchChartWithBatch(provider.provider_id, {
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

/* ============================================================
   ✅ MAIN TAB WITH PERFECT SCROLLING
============================================================ */
export function RankChartsTab() {
  const [periodId, setPeriodId] =
    useState<RankPeriodId>("24h");

  const [focusedProviderId, setFocusedProviderId] =
    useState<number | null>(null);

  const period: ChartPeriod =
    RANK_PERIODS.find((p) => p.id === periodId)?.apiPeriod ??
    "1d";

  const { data: providers = [] } = useWatchProviders("US", {
    limit: PROVIDERS_LIMIT,
  });

  const rowRefsMap = useRef<
    Record<number, HTMLDivElement | null>
  >({});

  /* ============================================================
     ✅ Default Netflix selection
  ============================================================ */
  useEffect(() => {
    if (!providers.length) return;

    if (focusedProviderId) return;

    const netflix = providers.find(
      (p) => p.provider_id === NETFLIX_PROVIDER_ID
    );

    if (netflix) {
      setFocusedProviderId(netflix.provider_id);
    }
  }, [providers, focusedProviderId]);

  /* ============================================================
     ✅ PERFECT SCROLL EFFECT (100% RELIABLE)
  ============================================================ */
  useEffect(() => {
    if (!focusedProviderId) return;

    const el = rowRefsMap.current[focusedProviderId];
    if (!el) return;

    // Wait until Popover closes + DOM finishes layout
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }, [focusedProviderId]);

  /* ============================================================
     Store row refs
  ============================================================ */
  const setRowRef =
    (providerId: number) => (el: HTMLDivElement | null) => {
      rowRefsMap.current[providerId] = el;
    };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <Image
            src="/jw-icon.png"
            alt="JustWatch"
            width={20}
            height={20}
            unoptimized
          />
          JustWatch Streaming Charts
        </h2>

        {/* Period Switch */}
        <div className="flex gap-2">
          {RANK_PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodId(p.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium",
                periodId === p.id
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Combobox */}
      {providers.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            Go to provider:
          </span>

          <ProviderCombobox
            providers={providers}
            focusedProviderId={focusedProviderId}
            onSelect={setFocusedProviderId}
          />
        </div>
      )}

      {/* Provider Rows */}
      <div className="space-y-6">
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
