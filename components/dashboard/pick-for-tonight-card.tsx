"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SheetLoadingDots } from "@/components/ui/sheet-loading-dots";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { PickForTonightPick } from "@/lib/pick-for-tonight-types";
import { cn } from "@/lib/utils";

type ApiPicks = {
  picks: { primary: PickForTonightPick; alternates: PickForTonightPick[] };
  questionCount: number;
  maxQuestions: number;
  usedAi: boolean;
};

function posterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/w300${posterPath}`;
}

function detailHref(pick: PickForTonightPick): string {
  return pick.mediaType === "tv" ? `/tv/${pick.tmdbId}` : `/movie/${pick.tmdbId}`;
}

function ExpandableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1">
      <p
        className={cn(
          "text-sm text-muted-foreground leading-relaxed",
          !expanded && "line-clamp-3",
          className
        )}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-foreground/80 hover:text-foreground transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" /> Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" /> Show more
          </>
        )}
      </button>
    </div>
  );
}

function PickCardItem({
  pick,
  rank,
  onNavigate,
}: {
  pick: PickForTonightPick;
  rank: "tonight" | "alt";
  onNavigate: () => void;
}) {
  const img = useMemo(() => posterUrl(pick.posterPath), [pick.posterPath]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 p-3 sm:p-4",
        rank === "tonight" && "ring-1 ring-primary/25 bg-primary/5"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          href={detailHref(pick)}
          className="relative h-48 w-full flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-36 sm:w-24"
          onClick={onNavigate}
        >
          {img ? (
            <Image src={img} alt={pick.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 96px" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
              No poster
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {rank === "tonight" ? (
              <Badge variant="default" className="text-xs">Tonight</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Alternate</Badge>
            )}
            <Badge variant="outline" className="text-xs capitalize">{pick.mediaType}</Badge>
            <Link
              href={detailHref(pick)}
              className="font-semibold text-foreground hover:underline line-clamp-2 break-words"
              onClick={onNavigate}
            >
              {pick.title}
            </Link>
          </div>

          <ExpandableText text={pick.reason} />

          {pick.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {pick.sources.map((s, idx) => (
                <span
                  key={`${pick.id}-source-${idx}`}
                  className="inline-flex max-w-full items-center rounded-md border border-border bg-background/80 px-2 py-0.5 text-xs text-foreground/90"
                  title={s}
                >
                  <span className="truncate">{s}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PickForTonightCard() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiPicks | null>(null);
  const [insufficientMessage, setInsufficientMessage] = useState<string | null>(null);

  const runPick = async () => {
    setOpen(true);
    setLoading(true);
    setData(null);
    setInsufficientMessage(null);
    try {
      const res = await fetch("/api/ai/pick-for-tonight", { method: "POST" });
      const json = await res.json();

      if (res.status === 403) {
        if (json.error === "QUESTION_LIMIT_REACHED") {
          toast.error(json.message || "AI question limit reached");
        } else if (json.error === "BETA_ADMIN_ONLY") {
          toast.error(json.message || "This beta is currently admin-only");
        } else {
          toast.error(json.message || json.error || "Request blocked");
        }
        setOpen(false);
        return;
      }

      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        setOpen(false);
        return;
      }

      if (json.insufficientContext) {
        setInsufficientMessage(json.message || "Add titles to your library first.");
        return;
      }

      if (json.picks) {
        setData(json as ApiPicks);
        return;
      }

      toast.error("Unexpected response");
      setOpen(false);
    } catch {
      toast.error("Network error");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="cursor-pointer border border-primary/15 px-3 text-sm font-medium hover:bg-primary/5"
        onClick={runPick}
      >
        Pick for tonight
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 sm:max-w-xl">
          <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3 sm:px-6">
            <h2 className="text-base font-semibold sm:text-lg">Pick for tonight</h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Choices are limited to your library so recommendations stay grounded in what you already saved.
            </p>
          </div>

          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
            {loading && <SheetLoadingDots className="min-h-[12rem] py-4" />}

            {!loading && insufficientMessage && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{insufficientMessage}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/my-list" onClick={() => setOpen(false)}>
                      Watchlist
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/lists" onClick={() => setOpen(false)}>
                      Lists
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/playlists" onClick={() => setOpen(false)}>
                      Playlists
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {!loading && data?.picks && (
              <div className="space-y-4 pt-1">
                <PickCardItem pick={data.picks.primary} rank="tonight" onNavigate={() => setOpen(false)} />
                {data.picks.alternates.map((p, idx) => (
                  <PickCardItem key={`${p.id}-${idx}`} pick={p} rank="alt" onNavigate={() => setOpen(false)} />
                ))}
                {data.usedAi === false && data.picks.alternates.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No AI call was used for this result (library too small or only one title without extra context).
                  </p>
                )}
                {typeof data.maxQuestions === "number" && data.maxQuestions !== -1 && (
                  <p className="text-xs text-muted-foreground">
                    AI questions used: {data.questionCount} / {data.maxQuestions}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
