import type { PickReasonCode, PickTonightAnchor } from "@/lib/pick-for-tonight/internal-types";

function calendarDaysSince(from: Date, now: Date): number {
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((t.getTime() - f.getTime()) / 86400000));
}

function sortedReasons(reasons: PickReasonCode[]): PickReasonCode[] {
  return [...reasons].sort((a, b) => b.weight - a.weight);
}

function reasonToClause(
  reason: PickReasonCode,
  anchor: PickTonightAnchor,
  primaryGenre: string | undefined,
  now: Date
): string | null {
  switch (reason.code) {
    case "trending":
      return "It's trending today—easy pick if you want something people are actually watching right now.";
    case "discovery":
      return primaryGenre
        ? `Fresh ${primaryGenre.toLowerCase()} from discovery—it matches your tastes but isn't sitting in your saved lists.`
        : "Surfaced from discovery based on your genre preferences—not pulled from a list you've already built.";
    case "stretch":
      return primaryGenre
        ? `A ${primaryGenre.toLowerCase()} stretch pick—adjacent to your usual lane, worth trying tonight.`
        : "A stretch pick outside your usual saves—good for shaking up the routine.";
    case "list":
      return `Your list "${reason.name}" keeps pointing here.`;
    case "playlist":
      return `It's queued on your playlist "${reason.name}".`;
    case "chat":
      return "You recently opened its details chat, so it's already on your radar.";
    case "note":
      return "You left a personal note when you saved it—that usually means real intent.";
    case "watchlist": {
      const days = reason.days ?? (anchor.watchlistedAt ? calendarDaysSince(anchor.watchlistedAt, now) : null);
      if (days == null) return "It's on your watchlist and ready when you are.";
      if (days >= 45) return `It's been on your watchlist for ${days} days—tonight might be the night.`;
      if (days >= 14) return `Saved to your watchlist a couple of weeks ago (${days} days).`;
      if (days >= 3) return "Still fairly new on your watchlist—you saved it while the mood was there.";
      return "It just hit your watchlist—worth striking while the mood is there.";
    }
    case "taste":
      return primaryGenre
        ? `Lines up with the ${primaryGenre.toLowerCase()} titles you've been collecting lately.`
        : "Fits how you've been browsing and saving on the app.";
    default:
      return null;
  }
}

/** Top 1–2 non-overlapping reason clauses → `whyTonight` string. */
export function buildWhyTonightFromReasons(
  reasons: PickReasonCode[],
  anchor: PickTonightAnchor,
  primaryGenre: string | undefined,
  now = new Date()
): string {
  const ranked = sortedReasons(reasons);
  const clauses: string[] = [];
  const used = new Set<PickReasonCode["code"]>();

  for (const reason of ranked) {
    if (used.has(reason.code)) continue;
    if (reason.code === "watchlist" && (used.has("list") || used.has("playlist") || used.has("discovery"))) {
      const days = reason.days ?? 0;
      if (days < 30) continue;
    }
    if (reason.code === "taste" && (used.has("discovery") || used.has("list") || used.has("playlist"))) {
      continue;
    }
    const clause = reasonToClause(reason, anchor, primaryGenre, now);
    if (!clause) continue;
    clauses.push(clause);
    used.add(reason.code);
    if (clauses.length >= 2) break;
  }

  if (clauses.length === 0) {
    return "Why tonight: It bubbled up from your activity on the app—worth committing to tonight.";
  }
  if (clauses.length === 1) {
    return `Why tonight: ${clauses[0]}`;
  }
  return `Why tonight: ${clauses[0]} ${clauses[1]}`;
}

/** Map legacy hints → structured reasons (for client mood heuristics that still read hints). */
export function hintsFromReasons(reasons: PickReasonCode[]): string[] {
  const hints: string[] = [];
  for (const r of reasons) {
    switch (r.code) {
      case "trending":
        hints.push("Trending today");
        break;
      case "discovery":
        hints.push("Matches your taste");
        break;
      case "stretch":
        hints.push("Stretch pick");
        break;
      case "watchlist":
        hints.push("Watchlist");
        break;
      case "list":
        hints.push(`List: ${r.name}`);
        break;
      case "playlist":
        hints.push(`Playlist: ${r.name}`);
        break;
      case "chat":
        hints.push("Recent title chat");
        break;
      case "note":
        hints.push("Has personal note");
        break;
      default:
        break;
    }
  }
  return hints;
}
