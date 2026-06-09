import {
  EMPTY_PICK_TONIGHT_ANCHOR,
  type PickTonightAnchor,
} from "@/lib/pick-for-tonight/internal-types";

export { EMPTY_PICK_TONIGHT_ANCHOR };
export type { PickTonightAnchor };

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
