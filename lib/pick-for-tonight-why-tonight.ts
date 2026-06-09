/** @deprecated Use @/lib/pick-for-tonight/reasons — kept for backward compatibility. */
export {
  EMPTY_PICK_TONIGHT_ANCHOR,
  mergeListTouch,
  mergePlaylistTouch,
  mergeWatchlistTouch,
  type PickTonightAnchor,
} from "@/lib/pick-for-tonight/anchors";

export type WhyTonightInput = {
  hints: string[];
  isTrendingTodayPick: boolean;
  genreNames: string[];
};
