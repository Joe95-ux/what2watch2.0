const RECENT_FINISHED_MS = 15 * 60 * 1000;

export type RecentlyFinishedPerson = {
  userId: string;
  name: string;
  avatar: string | null;
  finishedAt: string;
};

export function isRecentlyFinished(finishedAt: string, nowMs = Date.now()): boolean {
  const t = new Date(finishedAt).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t <= RECENT_FINISHED_MS;
}

export function formatRecentlyFinishedSummary(
  people: RecentlyFinishedPerson[],
  maxNames = 2
): string {
  if (!people.length) return "";
  const sorted = [...people].sort(
    (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
  );
  const names = sorted.map((p) => p.name);
  if (names.length === 1) return `${names[0]} finished recently`;
  if (names.length === 2) return `${names[0]} and ${names[1]} finished recently`;
  const shown = names.slice(0, maxNames).join(", ");
  const remaining = names.length - maxNames;
  return `${shown}, and ${remaining} ${remaining === 1 ? "other" : "others"} finished recently`;
}
