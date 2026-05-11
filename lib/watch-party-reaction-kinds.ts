export const WATCH_PARTY_REACTION_KINDS = ["heart", "fire", "clap"] as const;
export type WatchPartyReactionKind = (typeof WATCH_PARTY_REACTION_KINDS)[number];

export function isWatchPartyReactionKind(value: string): value is WatchPartyReactionKind {
  return (WATCH_PARTY_REACTION_KINDS as readonly string[]).includes(value);
}

export const WATCH_PARTY_REACTION_LABEL: Record<WatchPartyReactionKind, string> = {
  heart: "❤️",
  fire: "🔥",
  clap: "👏",
};
