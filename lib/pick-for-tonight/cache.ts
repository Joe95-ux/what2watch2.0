import { unstable_cache } from "next/cache";
import { getPickForTonightBucket, PICK_FOR_TONIGHT_CACHE_SECONDS } from "@/lib/pick-for-tonight/bucket";
import { buildPickForTonightResult } from "@/lib/pick-for-tonight/build";
import type { PickForTonightApiResult } from "@/lib/pick-for-tonight/internal-types";

/** Layer A cached build — default presentation only (no mood / avoid). */
export async function getCachedDefaultPicks(
  userId: string,
  bucket: string,
  onlyUnseen: boolean,
  trendingToday: boolean
): Promise<PickForTonightApiResult> {
  return unstable_cache(
    async () =>
      buildPickForTonightResult(userId, {
        onlyUnseen,
        trendingToday,
        rerankMode: null,
        avoidTmdbId: null,
        avoidLeadGenre: null,
        writeCooldownLog: true,
      }),
    ["pick-for-tonight", "v2", userId, bucket, onlyUnseen ? "u1" : "u0", trendingToday ? "t1" : "t0"],
    { revalidate: PICK_FOR_TONIGHT_CACHE_SECONDS }
  )();
}

export { getPickForTonightBucket };
