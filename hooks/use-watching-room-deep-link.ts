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

  const buildRoomInviteUrl = useCallback(
    (roomKey: string) => {
      if (typeof window === "undefined") return null;
      const params = new URLSearchParams(searchParams.toString());
      params.set("room", roomKey);
      return `${window.location.origin}${pathname}?${params.toString()}`;
    },
    [pathname, searchParams]
  );

  useEffect(() => {
    if (!focusedRoomKey || !rooms.length) return;
    const roomIndex = rooms.findIndex((room) => room.key === focusedRoomKey);
    if (roomIndex < 0) {
      setFocusedRoomInUrl(null);
      return;
    }
    const targetPage = Math.floor(roomIndex / pageSize) + 1;
    onFocusedRoomResolved(rooms[roomIndex], roomIndex, targetPage);
  }, [focusedRoomKey, onFocusedRoomResolved, pageSize, rooms, setFocusedRoomInUrl]);

  return {
    focusedRoomKey,
    setFocusedRoomInUrl,
    buildRoomInviteUrl,
  };
}
