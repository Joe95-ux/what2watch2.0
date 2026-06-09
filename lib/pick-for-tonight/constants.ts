/** Layer A: light pool size before enrich. */
export const LIGHT_POOL_CAP = 48;

/** Layer B: how many titles get TMDB/OMDB/JW enrichment per build. */
export const ENRICH_LIMIT = 24;

/** Client explore pool + mood rerank source. */
export const PRESENT_POOL_LIMIT = 12;

/** Hero + explore row count. */
export const PRESENT_PICK_LIMIT = 6;

/** Slot quotas when selecting candidates to enrich (sums to ENRICH_LIMIT). */
export const ENRICH_SLOTS = {
  library: 10,
  discovery: 8,
  trending: 4,
  stretch: 2,
} as const;

export const PICK_COOLDOWN_HOURS = 72;
