/**
 * Per-title AI chat persistence (localStorage). Keys include mediaType + tmdbId so
 * movie vs TV with the same numeric id do not share session or open state.
 */

export type MovieChatPersistPayload = {
  sessionId: string;
  sheetOpen?: boolean;
};

export function movieChatStorageKey(tmdbId: number, mediaType: "movie" | "tv"): string {
  return `w2w:movie-chat:${mediaType}:${tmdbId}`;
}

export function generateMovieChatSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function readMovieChatPersist(tmdbId: number, mediaType: "movie" | "tv"): MovieChatPersistPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(movieChatStorageKey(tmdbId, mediaType));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<MovieChatPersistPayload>;
    if (!p || typeof p.sessionId !== "string" || p.sessionId.length === 0) return null;
    const out: MovieChatPersistPayload = { sessionId: p.sessionId };
    if (typeof p.sheetOpen === "boolean") out.sheetOpen = p.sheetOpen;
    return out;
  } catch {
    return null;
  }
}

export function mergeMovieChatPersist(
  tmdbId: number,
  mediaType: "movie" | "tv",
  patch: Partial<MovieChatPersistPayload>
): void {
  if (typeof window === "undefined") return;
  try {
    const key = movieChatStorageKey(tmdbId, mediaType);
    const prev = readMovieChatPersist(tmdbId, mediaType);
    const merged: MovieChatPersistPayload = {
      sessionId: patch.sessionId ?? prev?.sessionId ?? generateMovieChatSessionId(),
    };
    if (patch.sheetOpen !== undefined) merged.sheetOpen = patch.sheetOpen;
    else if (prev?.sheetOpen !== undefined) merged.sheetOpen = prev.sheetOpen;
    localStorage.setItem(key, JSON.stringify(merged));
  } catch {
    // ignore quota / private mode
  }
}
