/** Server-safe watch party deep link (dashboard watching page). */
export function buildWatchPartyInvitePath(partyId: string, feedRoomKey: string): string {
  const params = new URLSearchParams();
  params.set("party", partyId);
  params.set("room", feedRoomKey);
  return `/watching?${params.toString()}`;
}

export function buildWatchPartyInviteUrl(
  partyId: string,
  feedRoomKey: string,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
): string {
  const path = buildWatchPartyInvitePath(partyId, feedRoomKey);
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}
