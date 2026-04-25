"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Heart,
  ListPlus,
  MessageSquare,
  PlayCircle,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useWatchingDashboard, useWatchingMutation } from "@/hooks/use-watching";
import type { WatchingSessionDTO } from "@/lib/watching-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type WatchingFeedCard = {
  id: string;
  user: string;
  avatar?: string | null;
  status: "watching" | "finished";
  title: string;
  subtitle: string;
  thought?: string;
  startedOrFinished: string;
  likes: number;
  replies: number;
};

const timeAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
};

const toFeedCard = (session: WatchingSessionDTO): WatchingFeedCard => {
  const userLabel = session.user.displayName || session.user.username || "Unknown user";
  const isWatching = session.status === "WATCHING_NOW";
  const thought = session.thoughts[0]?.content;
  return {
    id: session.id,
    user: userLabel,
    avatar: session.user.avatarUrl,
    status: isWatching ? "watching" : "finished",
    title: session.title,
    subtitle: `${session.mediaType === "movie" ? "Movie" : "TV"}${session.progressPercent != null ? ` · ${session.progressPercent}% through` : ""}`,
    thought,
    startedOrFinished: isWatching
      ? `Started ${timeAgo(session.startedAt)}`
      : `Finished ${timeAgo(session.endedAt || session.updatedAt)}`,
    likes: 0,
    replies: session.thoughts.length,
  };
};

function FeedCard({ item }: { item: WatchingFeedCard }) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={item.avatar ?? undefined} alt={item.user} />
            <AvatarFallback>{item.user[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{item.user}</p>
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full text-[10px]",
                  item.status === "watching"
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-primary/15 text-primary"
                )}
              >
                {item.status === "watching" ? "watching now" : "just finished"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{item.startedOrFinished}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 border-t border-border/60 pt-3">
        <div className="rounded-md bg-muted/30 p-3">
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
        </div>
        {item.thought ? (
          <p className="text-sm italic text-muted-foreground">"{item.thought}"</p>
        ) : null}
        <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-2">
          <Button variant="ghost" size="sm" className="cursor-pointer justify-center gap-1 text-xs">
            <Heart className="h-3.5 w-3.5" /> {item.likes}
          </Button>
          <Button variant="ghost" size="sm" className="cursor-pointer justify-center gap-1 text-xs">
            <MessageSquare className="h-3.5 w-3.5" /> {item.replies}
          </Button>
          <Button variant="ghost" size="sm" className="cursor-pointer justify-center gap-1 text-xs">
            <ListPlus className="h-3.5 w-3.5" /> Watchlist
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RightRail({
  currentSession,
  alsoWatchingCurrent,
  trendingTonight,
  thoughtText,
  onThoughtTextChange,
  spoilerMode,
  onSpoilerModeChange,
  onShareThought,
  onFinish,
  onStop,
  onProgressBump,
  onUseTrendingItem,
  isSubmitting,
}: {
  currentSession: WatchingSessionDTO | null;
  alsoWatchingCurrent: WatchingSessionDTO[];
  trendingTonight: Array<{ tmdbId: number; mediaType: "movie" | "tv"; title: string; posterPath: string | null; watchingCount: number }>;
  thoughtText: string;
  onThoughtTextChange: (value: string) => void;
  spoilerMode: boolean;
  onSpoilerModeChange: (value: boolean) => void;
  onShareThought: () => void;
  onFinish: () => void;
  onStop: () => void;
  onProgressBump: () => void;
  onUseTrendingItem: (item: { tmdbId: number; mediaType: "movie" | "tv"; title: string }) => void;
  isSubmitting: boolean;
}) {
  return (
    <aside className="w-full space-y-4">
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You're watching</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentSession ? (
            <>
              <div className="rounded-md bg-muted/30 p-3">
                <p className="text-sm font-medium">{currentSession.title}</p>
                <p className="text-xs text-muted-foreground">
                  {currentSession.mediaType === "movie" ? "Movie" : "TV"}
                  {currentSession.progressPercent != null ? ` · ${currentSession.progressPercent}% through` : ""}
                </p>
              </div>
              <Textarea
                rows={2}
                value={thoughtText}
                onChange={(e) => onThoughtTextChange(e.target.value)}
                placeholder="Share a thought - no spoilers..."
                className="resize-none text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="cursor-pointer" disabled={isSubmitting || !thoughtText.trim()} onClick={onShareThought}>
                  Share thought
                </Button>
                <Button
                  variant={spoilerMode ? "default" : "outline"}
                  size="sm"
                  className="cursor-pointer"
                  disabled={isSubmitting}
                  onClick={() => onSpoilerModeChange(!spoilerMode)}
                >
                  Spoiler
                </Button>
                <Button variant="outline" size="sm" className="cursor-pointer" disabled={isSubmitting} onClick={onProgressBump}>
                  +10% progress
                </Button>
                <Button variant="outline" size="sm" className="cursor-pointer" disabled={isSubmitting} onClick={onFinish}>
                  Finish
                </Button>
                <Button variant="ghost" size="sm" className="cursor-pointer" disabled={isSubmitting} onClick={onStop}>
                  Stop
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active session yet.</p>
          )}
        </CardContent>
      </Card>

      {!!alsoWatchingCurrent.length && (
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Also watching your title</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {alsoWatchingCurrent.slice(0, 5).map((session) => (
              <div key={session.id} className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/40">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={session.user.avatarUrl ?? undefined} />
                  <AvatarFallback>{(session.user.displayName || session.user.username || "U")[0]}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{session.user.displayName || session.user.username || "Someone"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trending tonight</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {trendingTonight.map((item, i) => (
            <button
              key={`${item.mediaType}-${item.tmdbId}`}
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-muted/40"
              onClick={() => onUseTrendingItem({ tmdbId: item.tmdbId, mediaType: item.mediaType, title: item.title })}
            >
              <span className="w-4 text-xs font-semibold text-muted-foreground">{i + 1}</span>
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
              <span className="truncate text-sm">{item.title}</span>
            </button>
          ))}
          {!trendingTonight.length ? <p className="text-xs text-muted-foreground">No sessions yet.</p> : null}
        </CardContent>
      </Card>
    </aside>
  );
}

export default function WatchingContent() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN" || currentUser?.isForumAdmin;
  const { data: watchingData, isLoading: isWatchingLoading } = useWatchingDashboard(Boolean(isAdmin));
  const watchingMutation = useWatchingMutation();
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeTmdbId, setComposeTmdbId] = useState("");
  const [composeMediaType, setComposeMediaType] = useState<"movie" | "tv">("movie");
  const [thoughtText, setThoughtText] = useState("");
  const [spoilerMode, setSpoilerMode] = useState(false);

  useEffect(() => {
    const sync = () => setIsRightOpen(window.innerWidth >= 1280);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const watchingNow = useMemo(
    () => (watchingData?.watchingNow ?? []).map(toFeedCard),
    [watchingData?.watchingNow]
  );
  const justFinished = useMemo(
    () => (watchingData?.justFinished ?? []).map(toFeedCard),
    [watchingData?.justFinished]
  );

  const submitStartWatching = async () => {
    const tmdbId = Number(composeTmdbId);
    if (!composeTitle.trim() || !Number.isInteger(tmdbId) || tmdbId <= 0) {
      toast.error("Add a title and valid TMDB id.");
      return;
    }

    try {
      await watchingMutation.mutateAsync({
        action: "start",
        tmdbId,
        mediaType: composeMediaType,
        title: composeTitle.trim(),
      });
      toast.success("Watching session started.");
      setThoughtText("");
      setSpoilerMode(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start session");
    }
  };

  const submitShareThought = async () => {
    const sessionId = watchingData?.currentSession?.id;
    if (!sessionId || !thoughtText.trim()) return;
    try {
      await watchingMutation.mutateAsync({
        action: "share_thought",
        sessionId,
        content: thoughtText.trim(),
        spoiler: spoilerMode,
      });
      setThoughtText("");
      setSpoilerMode(false);
      toast.success("Thought shared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share thought");
    }
  };

  const submitFinishOrStop = async (action: "finish" | "stop") => {
    const sessionId = watchingData?.currentSession?.id;
    if (!sessionId) return;
    try {
      await watchingMutation.mutateAsync({ action, sessionId });
      setThoughtText("");
      setSpoilerMode(false);
      toast.success(action === "finish" ? "Marked as finished." : "Session stopped.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update session");
    }
  };

  const submitProgressBump = async () => {
    const session = watchingData?.currentSession;
    if (!session) return;
    const nextProgress = Math.min(100, (session.progressPercent ?? 0) + 10);
    try {
      await watchingMutation.mutateAsync({
        action: "update_progress",
        sessionId: session.id,
        progressPercent: nextProgress,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update progress");
    }
  };

  if (isLoading || (isAdmin && isWatchingLoading)) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-xl border-border/70">
          <CardHeader>
            <p className="text-lg font-semibold">Watching is in admin beta</p>
            <p className="text-sm text-muted-foreground">
              This page is currently available to admins only while we validate core interactions and relevance.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">What are you watching?</h1>
          <p className="text-sm text-muted-foreground">See what your friends are watching right now.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="cursor-pointer gap-1.5" onClick={() => setIsRightOpen((v) => !v)}>
            {isRightOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {isRightOpen ? "Hide sidebar" : "Show sidebar"}
          </Button>
          <Button className="cursor-pointer gap-1.5">
            <PlayCircle className="h-4 w-4" />
            Share what you're watching
          </Button>
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-4", isRightOpen && "xl:grid-cols-[minmax(0,1fr)_300px]")}>
        <main className="min-w-0 space-y-4">
          <Card className="border-border/70">
            <CardContent className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_120px_110px_auto]">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser?.avatarUrl ?? undefined} />
                <AvatarFallback>{(currentUser?.username || currentUser?.displayName || "U")[0]}</AvatarFallback>
              </Avatar>
              <Input
                value={composeTitle}
                onChange={(e) => setComposeTitle(e.target.value)}
                placeholder={`What are you watching right now, ${currentUser?.displayName || currentUser?.username || "there"}?`}
              />
              <Input
                value={composeTmdbId}
                onChange={(e) => setComposeTmdbId(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="TMDB id"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={composeMediaType === "movie" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setComposeMediaType("movie")}
                >
                  Movie
                </Button>
                <Button
                  size="sm"
                  variant={composeMediaType === "tv" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setComposeMediaType("tv")}
                >
                  TV
                </Button>
              </div>
              <Button
                size="sm"
                className="cursor-pointer whitespace-nowrap"
                onClick={submitStartWatching}
                disabled={watchingMutation.isPending}
              >
                I'm watching...
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-emerald-500" /> Watching now
            </p>
            <Button variant="ghost" size="sm" className="h-7 cursor-pointer text-xs">See all</Button>
          </div>

          {watchingNow.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
          {!watchingNow.length ? <p className="text-sm text-muted-foreground">No one in your network is watching right now.</p> : null}

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Just finished</p>
          {justFinished.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
          {!justFinished.length ? <p className="text-sm text-muted-foreground">No recent finishes yet.</p> : null}
        </main>

        {isRightOpen ? (
          <RightRail
            currentSession={watchingData?.currentSession ?? null}
            alsoWatchingCurrent={watchingData?.alsoWatchingCurrent ?? []}
            trendingTonight={watchingData?.trendingTonight ?? []}
            thoughtText={thoughtText}
            onThoughtTextChange={setThoughtText}
            spoilerMode={spoilerMode}
            onSpoilerModeChange={setSpoilerMode}
            onShareThought={submitShareThought}
            onFinish={() => submitFinishOrStop("finish")}
            onStop={() => submitFinishOrStop("stop")}
            onProgressBump={submitProgressBump}
            onUseTrendingItem={(item) => {
              setComposeTitle(item.title);
              setComposeTmdbId(String(item.tmdbId));
              setComposeMediaType(item.mediaType);
              toast.message("Loaded trending title into composer.");
            }}
            isSubmitting={watchingMutation.isPending}
          />
        ) : null}
      </div>
    </div>
  );
}

