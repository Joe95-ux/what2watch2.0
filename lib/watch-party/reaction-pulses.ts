import {
  emptyWatchPartyReactionCounts,
  isWatchPartyReactionKind,
  WATCH_PARTY_REACTION_KINDS,
  WATCH_PARTY_REACTION_LABEL,
  type WatchPartyReactionKind,
} from "@/lib/watch-party-reaction-kinds";
import { formatPartyTimestampLabel } from "@/lib/watch-party/message-timestamp";

export type WatchPartyReactionPulseDto = {
  id: string;
  kind: WatchPartyReactionKind;
  timestampSec: number | null;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

export function mapReactionPulseRow(row: {
  id: string;
  kind: string;
  timestampSec: number | null;
  createdAt: Date;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}): WatchPartyReactionPulseDto | null {
  if (!isWatchPartyReactionKind(row.kind)) return null;
  return {
    id: row.id,
    kind: row.kind,
    timestampSec: row.timestampSec ?? null,
    createdAt: row.createdAt.toISOString(),
    user: {
      id: row.user.id,
      name: row.user.displayName || row.user.username || "Unknown",
      avatarUrl: row.user.avatarUrl,
    },
  };
}

export function aggregateReactionCounts(
  pulses: WatchPartyReactionPulseDto[]
): Record<WatchPartyReactionKind, number> {
  const counts = emptyWatchPartyReactionCounts();
  for (const pulse of pulses) {
    counts[pulse.kind] += 1;
  }
  return counts;
}

export type ReactionPulseMomentGroup = {
  momentKey: string;
  momentLabel: string | null;
  timestampSec: number | null;
  counts: Partial<Record<WatchPartyReactionKind, number>>;
  latestAt: string;
};

/** Group recent pulses by watch minute for compact UI. */
export function groupReactionPulsesByMoment(
  pulses: WatchPartyReactionPulseDto[],
  maxGroups = 8
): ReactionPulseMomentGroup[] {
  const map = new Map<string, ReactionPulseMomentGroup>();

  for (const pulse of pulses) {
    const momentKey =
      pulse.timestampSec != null ? `t:${Math.round(pulse.timestampSec / 60)}` : "t:unknown";
    const existing = map.get(momentKey);
    if (!existing) {
      map.set(momentKey, {
        momentKey,
        momentLabel: formatPartyTimestampLabel(pulse.timestampSec),
        timestampSec: pulse.timestampSec,
        counts: { [pulse.kind]: 1 },
        latestAt: pulse.createdAt,
      });
      continue;
    }
    existing.counts[pulse.kind] = (existing.counts[pulse.kind] ?? 0) + 1;
    if (new Date(pulse.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
      existing.latestAt = pulse.createdAt;
    }
  }

  return [...map.values()]
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())
    .slice(0, maxGroups);
}

export function formatPulseGroupLine(group: ReactionPulseMomentGroup): string {
  const emojis = WATCH_PARTY_REACTION_KINDS.filter((k) => (group.counts[k] ?? 0) > 0)
    .map((k) => {
      const n = group.counts[k] ?? 0;
      const label = WATCH_PARTY_REACTION_LABEL[k];
      return n > 1 ? `${label}×${n}` : label;
    })
    .join(" ");
  const when = group.momentLabel ?? "recently";
  return `${when}: ${emojis}`;
}
