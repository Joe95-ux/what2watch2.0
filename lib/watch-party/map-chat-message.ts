export function mapWatchPartyChatMessage(row: {
  id: string;
  content: string;
  createdAt: Date;
  timestampSec: number | null;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}) {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    timestampSec: row.timestampSec ?? null,
    user: {
      id: row.user.id,
      name: row.user.displayName || row.user.username || "Unknown",
      avatarUrl: row.user.avatarUrl,
    },
  };
}
