export function mapWatchPartyMarker(row: {
  id: string;
  timestampSec: number;
  label: string | null;
  createdAt: Date;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}) {
  return {
    id: row.id,
    timestampSec: row.timestampSec,
    label: row.label?.trim() || null,
    createdAt: row.createdAt.toISOString(),
    user: {
      id: row.user.id,
      name: row.user.displayName || row.user.username || "Unknown",
      avatarUrl: row.user.avatarUrl,
    },
  };
}

export type WatchPartyMarkerDto = ReturnType<typeof mapWatchPartyMarker>;
