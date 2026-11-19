"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ResponsiveDialogSurface } from "@/components/ui/responsive-dialog-surface";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import {
  DASHBOARD_LANDINGS,
  DASHBOARD_SECTION_IDS,
  DASHBOARD_SECTION_META,
  DASHBOARD_STAT_IDS,
  DASHBOARD_STAT_META,
  DEFAULT_DASHBOARD_LAYOUT,
  dashboardLandingHref,
  normalizeDashboardLayout,
  type DashboardLanding,
  type DashboardLayout,
  type DashboardSectionId,
  type DashboardStatId,
} from "@/lib/dashboard-layout";

type Draft = {
  sectionOrder: DashboardSectionId[];
  hiddenSections: DashboardSectionId[];
  statOrder: DashboardStatId[];
  landing: DashboardLanding;
  picksHidden: boolean;
  onlyUnseen: boolean;
  trendingToday: boolean;
};

function draftFromLayout(layout: DashboardLayout): Draft {
  const selected = new Set(layout.statIds);
  const statOrder = [
    ...layout.statIds,
    ...DASHBOARD_STAT_IDS.filter((id) => !selected.has(id)),
  ];
  return {
    sectionOrder: [...layout.sectionOrder],
    hiddenSections: [...layout.hiddenSections],
    statOrder,
    landing: layout.landing,
    picksHidden: layout.pickDefaults.picksHidden,
    onlyUnseen: layout.pickDefaults.onlyUnseen,
    trendingToday: layout.pickDefaults.trendingToday,
  };
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export function DashboardCustomizeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const { data: preferences, isFetched } = useUserPreferences();
  const layout = useMemo(
    () => normalizeDashboardLayout(preferences?.dashboardLayout),
    [preferences?.dashboardLayout]
  );
  const [draft, setDraft] = useState<Draft>(() => draftFromLayout(DEFAULT_DASHBOARD_LAYOUT));
  const [selectedStats, setSelectedStats] = useState<DashboardStatId[]>(DEFAULT_DASHBOARD_LAYOUT.statIds);
  const [saving, setSaving] = useState(false);
  const seededForOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      seededForOpen.current = false;
      return;
    }
    if (!isFetched || seededForOpen.current) return;
    seededForOpen.current = true;
    setDraft(draftFromLayout(layout));
    setSelectedStats(layout.statIds);
  }, [open, isFetched, layout]);

  const chosenStats = draft.statOrder.filter((id) => selectedStats.includes(id));

  const toggleSection = (id: DashboardSectionId, visible: boolean) => {
    setDraft((current) => ({
      ...current,
      hiddenSections: visible
        ? current.hiddenSections.filter((item) => item !== id)
        : current.hiddenSections.includes(id)
          ? current.hiddenSections
          : [...current.hiddenSections, id],
    }));
  };

  const toggleStat = (id: DashboardStatId, on: boolean) => {
    setSelectedStats((current) => {
      if (!on) return current.filter((item) => item !== id);
      if (current.includes(id) || current.length >= 4) return current;
      return [...current, id];
    });
  };

  const save = async () => {
    if (chosenStats.length !== 4) return;
    const next: DashboardLayout = {
      sectionOrder: draft.sectionOrder.length ? draft.sectionOrder : [...DASHBOARD_SECTION_IDS],
      hiddenSections: draft.hiddenSections,
      statIds: chosenStats,
      landing: draft.landing,
      pickDefaults: {
        picksHidden: draft.picksHidden,
        onlyUnseen: draft.onlyUnseen,
        trendingToday: draft.trendingToday,
      },
    };
    setSaving(true);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardLayout: next }),
      });
      if (!response.ok) throw new Error("Failed to save");
      await queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      toast.success("Home layout saved");
      onOpenChange(false);
      if (pathname === "/dashboard" && next.landing !== "home") {
        router.push(dashboardLandingHref(next.landing));
      }
    } catch {
      toast.error("Could not save the home layout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialogSurface
      open={open}
      onOpenChange={onOpenChange}
      title="Customize home"
      description="Choose what the dashboard home shows. Theme and notifications stay in Settings."
      dialogClassName="sm:max-w-lg"
      footer={
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/settings"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => onOpenChange(false)}
          >
            Taste and notifications
          </Link>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => void save()}
              disabled={saving || chosenStats.length !== 4}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-8 px-4 py-4 sm:px-6">
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Open Dashboard on</h3>
            <p className="text-xs text-muted-foreground">The sidebar Dashboard item starts here.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DASHBOARD_LANDINGS.map((item) => {
              const selected = draft.landing === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, landing: item.id }))}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors",
                    selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60"
                  )}
                >
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </button>
              );
            })}
          </div>
          {draft.landing !== "home" ? (
            <Link
              href="/dashboard?home=1"
              className="inline-block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Open the home layout anyway
            </Link>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium">Top row</h3>
              <p className="text-xs text-muted-foreground">Pick four numbers. Order is left to right.</p>
            </div>
            <span className="text-xs text-muted-foreground">{chosenStats.length}/4</span>
          </div>
          <div className="space-y-2">
            {draft.statOrder.map((id, index) => {
              const on = selectedStats.includes(id);
              const locked = !on && selectedStats.length >= 4;
              return (
                <div
                  key={id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2 py-2",
                    on ? "border-border bg-card" : "border-transparent bg-muted/40"
                  )}
                >
                  <div className="flex shrink-0 flex-col">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer"
                      aria-label={`Move ${DASHBOARD_STAT_META[id].label} up`}
                      disabled={index === 0}
                      onClick={() =>
                        setDraft((current) => ({ ...current, statOrder: moveItem(current.statOrder, index, -1) }))
                      }
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer"
                      aria-label={`Move ${DASHBOARD_STAT_META[id].label} down`}
                      disabled={index === draft.statOrder.length - 1}
                      onClick={() =>
                        setDraft((current) => ({ ...current, statOrder: moveItem(current.statOrder, index, 1) }))
                      }
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{DASHBOARD_STAT_META[id].label}</p>
                    <p className="text-xs text-muted-foreground">{DASHBOARD_STAT_META[id].helper}</p>
                  </div>
                  <Switch
                    checked={on}
                    disabled={locked}
                    onCheckedChange={(checked) => toggleStat(id, checked)}
                    aria-label={`${on ? "Remove" : "Add"} ${DASHBOARD_STAT_META[id].label}`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Home sections</h3>
            <p className="text-xs text-muted-foreground">
              Pick for tonight stays at the top. Hide or reorder everything under it.
            </p>
          </div>
          <div className="space-y-2">
            {draft.sectionOrder.map((id, index) => {
              const visible = !draft.hiddenSections.includes(id);
              return (
                <div
                  key={id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2 py-2",
                    visible ? "border-border bg-card" : "border-transparent bg-muted/40"
                  )}
                >
                  <div className="flex shrink-0 flex-col">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer"
                      aria-label={`Move ${DASHBOARD_SECTION_META[id].label} up`}
                      disabled={index === 0}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          sectionOrder: moveItem(current.sectionOrder, index, -1),
                        }))
                      }
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer"
                      aria-label={`Move ${DASHBOARD_SECTION_META[id].label} down`}
                      disabled={index === draft.sectionOrder.length - 1}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          sectionOrder: moveItem(current.sectionOrder, index, 1),
                        }))
                      }
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{DASHBOARD_SECTION_META[id].label}</p>
                    <p className="text-xs text-muted-foreground">{DASHBOARD_SECTION_META[id].description}</p>
                  </div>
                  <Switch
                    checked={visible}
                    onCheckedChange={(checked) => toggleSection(id, checked)}
                    aria-label={`${visible ? "Hide" : "Show"} ${DASHBOARD_SECTION_META[id].label}`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Pick for tonight</h3>
            <p className="text-xs text-muted-foreground">Saved defaults for the next visit. Today&apos;s pick is left as-is.</p>
          </div>
          <div className="space-y-3 rounded-lg border px-3 py-2">
            {(
              [
                ["picksHidden", "Hide picks", "Start with the row collapsed"],
                ["onlyUnseen", "Only unseen", "Skip titles already in your diary"],
                ["trendingToday", "Trending today", "Bias the pool toward what is moving today"],
              ] as const
            ).map(([key, label, description]) => (
              <div key={key} className="flex items-center justify-between gap-3 py-1">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={draft[key]}
                  onCheckedChange={(checked) => setDraft((current) => ({ ...current, [key]: checked }))}
                  aria-label={label}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            className="cursor-pointer text-muted-foreground"
            onClick={() => {
              const fresh = draftFromLayout(DEFAULT_DASHBOARD_LAYOUT);
              setDraft(fresh);
              setSelectedStats(DEFAULT_DASHBOARD_LAYOUT.statIds);
            }}
          >
            Reset to default
          </Button>
        </div>
      </div>
    </ResponsiveDialogSurface>
  );
}
