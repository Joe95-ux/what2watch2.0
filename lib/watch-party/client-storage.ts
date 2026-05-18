/** Clear per-party keys used for join toasts and auto-start watching session. */
export function clearWatchPartySessionStorage(partyId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`w2w:watch-party:landed:${partyId}`);
  sessionStorage.removeItem(`w2w:watch-party:auto-session:${partyId}`);
}
