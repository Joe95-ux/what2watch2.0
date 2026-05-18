import type { QueryClient } from "@tanstack/react-query";

export function removeWatchPartyQueries(queryClient: QueryClient, partyId: string): void {
  void queryClient.removeQueries({ queryKey: ["watch-party-room", partyId] });
  void queryClient.removeQueries({ queryKey: ["watch-party-chat", partyId] });
  void queryClient.removeQueries({ queryKey: ["watch-party-reactions", partyId] });
}
