"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type WatchRoomLike = {
  key: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
};

export function useWatchingRoomDeepLink({
  rooms,
  pageSize,
  onFocusedRoomResolved,
}: {
  rooms: WatchRoomLike[];
  pageSize: number;
  onFocusedRoomResolved: (room: WatchRoomLike, roomIndex: number, targetPage: number) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusedRoomKey = searchParams.get("room");
  const partyId = searchParams.get("party");

  /** Updates `room` only; preserves `party` and other params (e.g. after landing with ?party=). */
  const setFocusedRoomInUrl = useCallback(
    (roomKey: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (roomKey) {
        params.set("room", roomKey);
      } else {
        params.delete("room");
      }
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  /** Focus a feed card from the dashboard: clears watch-party context so Pusher matches the visible card. */
  const setFeedRoomFocusInUrl = useCallback(
    (roomKey: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("party");
      if (roomKey) {
        params.set("room", roomKey);
      } else {
        params.delete("room");
      }
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  /** After host ensures a party: pin both ids in the URL so realtime subscription uses the Mongo room id. */
  const setPartyAndRoomInUrl = useCallback(
    (nextPartyId: string, roomKey: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("party", nextPartyId);
      params.set("room", roomKey);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const buildRoomInviteUrl = useCallback(
    (roomKey: string) => {
      if (typeof window === "undefined") return null;
      const params = new URLSearchParams(searchParams.toString());
      params.set("room", roomKey);
      return `${window.location.origin}${pathname}?${params.toString()}`;
    },
    [pathname, searchParams]
  );

  /** Watch party invite: stable deep link with Mongo party id + feed room key for scroll/focus. */
  const buildPartyInviteUrl = useCallback(
    (partyMongoId: string, roomKey: string) => {
      if (typeof window === "undefined") return null;
      const params = new URLSearchParams();
      params.set("party", partyMongoId);
      params.set("room", roomKey);
      return `${window.location.origin}${pathname}?${params.toString()}`;
    },
    [pathname]
  );

  useEffect(() => {
    if (!focusedRoomKey || !rooms.length) return;
    const roomIndex = rooms.findIndex((room) => room.key === focusedRoomKey);
    if (roomIndex < 0) {
      if (partyId) return;
      setFocusedRoomInUrl(null);
      return;
    }
    const targetPage = Math.floor(roomIndex / pageSize) + 1;
    onFocusedRoomResolved(rooms[roomIndex], roomIndex, targetPage);
  }, [focusedRoomKey, onFocusedRoomResolved, pageSize, partyId, rooms, setFocusedRoomInUrl]);

  return {
    focusedRoomKey,
    partyId,
    setFocusedRoomInUrl,
    setFeedRoomFocusInUrl,
    setPartyAndRoomInUrl,
    buildRoomInviteUrl,
    buildPartyInviteUrl,
  };
}
