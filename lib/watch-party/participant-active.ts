/** Active member: not left (Mongo may omit `leftAt` instead of storing null). */
export function isActiveWatchPartyParticipant(leftAt: Date | null | undefined): boolean {
  return leftAt == null;
}
