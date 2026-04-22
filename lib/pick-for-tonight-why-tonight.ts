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
 * Short, human “Why tonight:” blurb from real signals (lists, playlists, watchlist age, chat, notes, trending).
 */
export function buildWhyTonight(candidate: WhyTonightInput, anchor: PickTonightAnchor, now = new Date()): string {
  if (candidate.isTrendingTodayPick || candidate.hints.some((h) => h.toLowerCase().includes("trending today"))) {
    return "Why tonight: It's trending today—easy pick if you want something people are actually watching right now.";
  }

  const hasNote = candidate.hints.includes("Has personal note");
  const recentChat = candidate.hints.includes("Recent title chat");
  const primaryGenre = candidate.genreNames[0]?.trim();

  /** Order matters: lead with taste, then tenure, then where it lives in your library, then intent signals. */
  const clauses: string[] = [];

  if (primaryGenre) {
    clauses.push(
      `You've been curating a lot of ${primaryGenre.toLowerCase()} titles lately, and this one lines up with that thread.`
    );
  }

  if (anchor.watchlistedAt) {
    const days = calendarDaysSince(anchor.watchlistedAt, now);
    if (days >= 14) {
      clauses.push(`It's been sitting on your watchlist for ${days} days.`);
    } else if (days >= 7) {
      clauses.push(`It's been on your watchlist for about a week (${days} days).`);
    } else if (days >= 1) {
      clauses.push(`It only landed on your watchlist ${days} day${days === 1 ? "" : "s"} ago—still fresh.`);
    } else {
      clauses.push("It just hit your watchlist—worth striking while the mood is there.");
    }
  }

  const lists = anchor.listNames.filter(Boolean);
  if (lists.length === 1) {
    clauses.push(`Your list "${lists[0]}" keeps surfacing it.`);
  } else if (lists.length >= 2) {
    clauses.push(`It shows up on "${lists[0]}" and "${lists[1]}", so you've bumped into it more than once.`);
  }

  const playlists = anchor.playlistNames.filter(Boolean);
  if (playlists.length === 1 && lists.length === 0) {
    clauses.push(`Your playlist "${playlists[0]}" is holding a spot for it.`);
  } else if (playlists.length >= 1 && lists.length > 0) {
    clauses.push(`It's also parked in "${playlists[0]}" on the playlist side.`);
  }

  if (recentChat) {
    clauses.push("You recently opened its details chat, so it's already on your mind.");
  }

  if (hasNote) {
    clauses.push("You left a note on it—so it clearly mattered when you saved it.");
  }

  const picked = clauses.slice(0, 2);
  if (picked.length === 0) {
    return "Why tonight: It bubbled up from your lists, playlists, and saved titles—tonight's a good night to commit.";
  }

  if (picked.length === 1) {
    return `Why tonight: ${picked[0]}`;
  }

  return `Why tonight: ${picked[0]} ${picked[1]}`;
}
