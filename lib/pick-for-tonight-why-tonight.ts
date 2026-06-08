/** Per-title anchors from lists / playlists / watchlist (favorites) used for “Why tonight” copy. */
export type PickTonightAnchor = {
  watchlistedAt: Date | null;
  listAnchoredAt: Date | null;
  listNames: string[];
  playlistAnchoredAt: Date | null;
  playlistNames: string[];
};

export const EMPTY_PICK_TONIGHT_ANCHOR: PickTonightAnchor = {
  watchlistedAt: null,
  listAnchoredAt: null,
  listNames: [],
  playlistAnchoredAt: null,
  playlistNames: [],
};

function calendarDaysSince(from: Date, now: Date): number {
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((t.getTime() - f.getTime()) / 86400000));
}

function pushUniqueName(names: string[], raw: string) {
  const n = raw.trim();
  if (!n || names.includes(n)) return;
  names.push(n);
}

export function getOrCreateAnchor(map: Map<string, PickTonightAnchor>, id: string): PickTonightAnchor {
  let a = map.get(id);
  if (!a) {
    a = { ...EMPTY_PICK_TONIGHT_ANCHOR, listNames: [], playlistNames: [] };
    map.set(id, a);
  }
  return a;
}

export function mergeListTouch(
  map: Map<string, PickTonightAnchor>,
  id: string,
  listName: string,
  itemCreatedAt: Date | null | undefined
) {
  const a = getOrCreateAnchor(map, id);
  pushUniqueName(a.listNames, listName);
  if (itemCreatedAt) {
    if (!a.listAnchoredAt || itemCreatedAt < a.listAnchoredAt) a.listAnchoredAt = itemCreatedAt;
  }
}

export function mergePlaylistTouch(
  map: Map<string, PickTonightAnchor>,
  id: string,
  playlistName: string,
  itemCreatedAt: Date | null | undefined
) {
  const a = getOrCreateAnchor(map, id);
  pushUniqueName(a.playlistNames, playlistName);
  if (itemCreatedAt) {
    if (!a.playlistAnchoredAt || itemCreatedAt < a.playlistAnchoredAt) a.playlistAnchoredAt = itemCreatedAt;
  }
}

export function mergeWatchlistTouch(map: Map<string, PickTonightAnchor>, id: string, createdAt: Date) {
  const a = getOrCreateAnchor(map, id);
  a.watchlistedAt = createdAt;
}

export type WhyTonightInput = {
  hints: string[];
  isTrendingTodayPick: boolean;
  genreNames: string[];
};

/**
 * Short “Why tonight” blurb — prioritizes discovery, lists, and behaviour over watchlist tenure.
 */
export function buildWhyTonight(candidate: WhyTonightInput, anchor: PickTonightAnchor, now = new Date()): string {
  if (candidate.isTrendingTodayPick || candidate.hints.some((h) => h.toLowerCase().includes("trending today"))) {
    return "Why tonight: It's trending today—easy pick if you want something people are actually watching right now.";
  }

  const isDiscovery = candidate.hints.some((h) => h.startsWith("Matches your taste"));
  const hasNote = candidate.hints.includes("Has personal note");
  const recentChat = candidate.hints.includes("Recent title chat");
  const onWatchlist = candidate.hints.includes("Watchlist");
  const listHint = candidate.hints.find((h) => h.startsWith("List:"));
  const playlistHint = candidate.hints.find((h) => h.startsWith("Playlist:"));
  const primaryGenre = candidate.genreNames[0]?.trim();
  const variationSeed = (candidate.hints.join("|").length + (primaryGenre?.length ?? 0)) % 3;

  const clauses: string[] = [];

  if (isDiscovery) {
    if (primaryGenre) {
      clauses.push(
        `Fresh ${primaryGenre.toLowerCase()} pick from TMDB discovery—it matches your genre tastes but isn't sitting in your saved lists.`
      );
    } else {
      clauses.push("Surfaced from discovery based on your genre preferences—not pulled from a list you've already built.");
    }
  }

  if (listHint) {
    const name = listHint.replace(/^List:\s*/, "").trim();
    if (name) clauses.push(`Your list "${name}" keeps pointing here.`);
  }

  if (playlistHint) {
    const name = playlistHint.replace(/^Playlist:\s*/, "").trim();
    if (name) clauses.push(`It's queued on your playlist "${name}".`);
  }

  if (recentChat) {
    clauses.push("You recently opened its details chat, so it's already on your radar.");
  }

  if (hasNote) {
    clauses.push("You left a personal note when you saved it—that usually means real intent.");
  }

  if (!isDiscovery && primaryGenre && clauses.length < 2) {
    const g = primaryGenre.toLowerCase();
    if (variationSeed === 0) {
      clauses.push(`Lines up with the ${g} titles you've been collecting lately.`);
    } else if (variationSeed === 1) {
      clauses.push(`Fits the ${g} lane your library has been leaning toward.`);
    } else {
      clauses.push(`A solid ${g} match for how you've been browsing and saving.`);
    }
  }

  if (onWatchlist && anchor.watchlistedAt && clauses.length < 2) {
    const days = calendarDaysSince(anchor.watchlistedAt, now);
    const onlyWatchlistSignal =
      !listHint && !playlistHint && !isDiscovery && !recentChat && !hasNote;
    if (onlyWatchlistSignal || days >= 45) {
      if (days >= 30) {
        clauses.push(`It's been on your watchlist for ${days} days—tonight might be the night.`);
      } else if (days >= 14) {
        clauses.push(`Saved to your watchlist a couple of weeks ago (${days} days).`);
      } else if (days >= 3) {
        clauses.push("Still fairly new on your watchlist—you saved it while the mood was there.");
      }
    }
  }

  const picked = clauses.slice(0, 2);
  if (picked.length === 0) {
    return "Why tonight: It bubbled up from your activity on the app—worth committing to tonight.";
  }

  if (picked.length === 1) {
    return `Why tonight: ${picked[0]}`;
  }

  return `Why tonight: ${picked[0]} ${picked[1]}`;
}
