"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  return `https://image.tmdb.org/t/p/w185${posterPath}`;
}

function detailHref(pick: PickForTonightPick): string {
  return pick.mediaType === "tv" ? `/tv/${pick.tmdbId}` : `/movie/${pick.tmdbId}`;
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

      if (res.status === 403 && json.error === "QUESTION_LIMIT_REACHED") {
        toast.error(json.message || "AI question limit reached");
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

  const renderPick = (pick: PickForTonightPick, rank: "tonight" | "alt") => {
    const img = posterUrl(pick.posterPath);
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-muted/30 p-3 sm:p-4 flex gap-3 sm:gap-4",
          rank === "tonight" && "ring-1 ring-primary/25 bg-primary/5"
        )}
      >
        <Link
          href={detailHref(pick)}
          className="relative h-[7.5rem] w-12 sm:h-36 sm:w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted border border-border"
          onClick={() => setOpen(false)}
        >
          {img ? (
            <Image src={img} alt={pick.title} fill className="object-cover" sizes="96px" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground text-center px-1">
              No poster
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {rank === "tonight" ? (
              <Badge variant="default" className="text-xs">
                Tonight
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Alternate
              </Badge>
            )}
            <Badge variant="outline" className="text-xs capitalize">
              {pick.mediaType}
            </Badge>
            <Link
              href={detailHref(pick)}
              className="font-semibold text-foreground hover:underline line-clamp-2"
              onClick={() => setOpen(false)}
            >
              {pick.title}
            </Link>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{pick.reason}</p>
          {pick.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {pick.sources.map((s) => (
                <span
                  key={s}
                  className="inline-flex max-w-full items-center rounded-md bg-background/80 px-2 py-0.5 text-xs text-foreground/90 border border-border"
                >
                  <span className="truncate">{s}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="mb-4 sm:mb-6 border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Moon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-lg">Pick for tonight</CardTitle>
              <CardDescription className="text-sm leading-snug">
                One explainable suggestion from titles already on your lists, playlists, and watchlist—using your
                notes and recent per-title chats when available.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Button type="button" className="cursor-pointer gap-2" onClick={runPick}>
            <Sparkles className="h-4 w-4" />
            Pick for tonight
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pick for tonight</DialogTitle>
            <DialogDescription>
              Choices are limited to your library so recommendations stay grounded in what you already saved.
            </DialogDescription>
          </DialogHeader>

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
              {renderPick(data.picks.primary, "tonight")}
              {data.picks.alternates.map((p) => (
                <div key={p.id}>{renderPick(p, "alt")}</div>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
