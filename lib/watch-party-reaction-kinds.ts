export const WATCH_PARTY_REACTION_KINDS = [
  "heart",
  "fire",
  "clap",
  "laugh",
  "wow",
  "sad",
  "thumbsup",
  "popcorn",
] as const;
export type WatchPartyReactionKind = (typeof WATCH_PARTY_REACTION_KINDS)[number];

export function isWatchPartyReactionKind(value: string): value is WatchPartyReactionKind {
  return (WATCH_PARTY_REACTION_KINDS as readonly string[]).includes(value);
}

export const WATCH_PARTY_REACTION_LABEL: Record<WatchPartyReactionKind, string> = {
  heart: "❤️",
  fire: "🔥",
  clap: "👏",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  thumbsup: "👍",
  popcorn: "🍿",
};

export function emptyWatchPartyReactionCounts(): Record<WatchPartyReactionKind, number> {
  return Object.fromEntries(
    WATCH_PARTY_REACTION_KINDS.map((kind) => [kind, 0])
  ) as Record<WatchPartyReactionKind, number>;
}
