/**
 * Bulk list/playlist updates replace all items. When the client omits `note` on an
 * item payload, we preserve the existing DB note for that (tmdbId, mediaType) pair.
 */

export function buildTmdbItemNoteMap(
  rows: Array<{ tmdbId: number; mediaType: string; note: string | null }>
): Map<string, string | null> {
  return new Map(rows.map((r) => [`${r.tmdbId}::${r.mediaType}`, r.note]));
}

export function resolveNoteForBulkTmdbItem(
  item: { tmdbId: number; mediaType: string; note?: string | null },
  preserved: Map<string, string | null>
): string | null {
  if (Object.prototype.hasOwnProperty.call(item, "note")) {
    const n = item.note;
    if (n == null || n === "") return null;
    const t = String(n).trim();
    return t === "" ? null : t;
  }
  return preserved.get(`${item.tmdbId}::${item.mediaType}`) ?? null;
}
