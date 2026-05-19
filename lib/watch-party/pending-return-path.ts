const PENDING_RETURN_KEY = "w2w:watch-party:return-path";

/** Save full path before sign-in so invite query params survive Clerk redirect. */
export function saveWatchPartyReturnPath(path: string): void {
  if (typeof window === "undefined" || !path.includes("party=")) return;
  sessionStorage.setItem(PENDING_RETURN_KEY, path);
}

export function consumeWatchPartyReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const path = sessionStorage.getItem(PENDING_RETURN_KEY);
  if (!path) return null;
  sessionStorage.removeItem(PENDING_RETURN_KEY);
  return path;
}
