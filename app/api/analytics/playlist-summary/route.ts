import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma, PlaylistEngagementType } from "@prisma/client";

import { db } from "@/lib/db";

const DEFAULT_RANGE_DAYS = 30;

type RawNumber =
  | number
  | string
  | { $numberInt?: string }
  | { $numberDouble?: string }
  | { $numberLong?: string }
  | { $numberDecimal?: string };

type RawObjectId = string | { $oid?: string };

type TotalsRawRow = { _id?: unknown; count?: RawNumber };
type TrendRawRow = {
  _id?: { day?: string; type?: string };
  count?: RawNumber;
};
type LeaderboardCountEntry = { type?: string; count?: RawNumber };
type LeaderboardRawRow = {
  _id?: RawObjectId;
  counts?: LeaderboardCountEntry[] | null;
  total?: RawNumber;
};
type SourceRawRow = { _id?: unknown; count?: RawNumber };
type UniqueVisitorsRawRow = { count?: RawNumber };

const asArray = <T>(value: Prisma.JsonValue | null | undefined): T[] => {
  return Array.isArray(value) ? (value as T[]) : [];
};

const toNumber = (value: RawNumber | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

const possibleKeys = [
  "$numberInt",
  "$numberDouble",
  "$numberLong",
  "$numberDecimal",
] as const;

  for (const key of possibleKeys) {
    const raw = (value as Record<string, string | undefined>)[key];
    if (raw !== undefined) {
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }

  return 0;
};

const toObjectIdString = (value: RawObjectId | undefined | null): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "$oid" in value && value.$oid) {
    return value.$oid;
  }
  return null;
};

const parseRangeDays = (input: string | null): number | null => {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  const match = normalized.match(/(\d+)/);
  if (!match) return null;

  const value = Number.parseInt(match[1] ?? "", 10);
  return Number.isNaN(value) || value <= 0 ? null : value;
};

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const rangeDaysParam = parseRangeDays(searchParams.get("range"));
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");

    // By default, show all data (no date filter)
    // Only apply date filter if user explicitly provides range, startDate, or endDate
    const hasDateFilter = !!(rangeDaysParam || startParam || endParam);

    let startDate: Date | null = null;
    let now: Date | null = null;

    if (hasDateFilter) {
      // User wants to filter by date - process the date parameters
      now = endParam ? new Date(endParam) : new Date();
      if (Number.isNaN(now.getTime())) {
        return NextResponse.json(
          { error: "Invalid endDate parameter" },
          { status: 400 }
        );
      }

      // Debug: Log current date
      console.log(`[Analytics] Current date (now): ${now.toISOString()}, timestamp: ${now.getTime()}`);

      startDate = startParam ? new Date(startParam) : null;
      if (startDate && Number.isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid startDate parameter" },
          { status: 400 }
        );
      }

      if (!startDate) {
        const days = rangeDaysParam ?? DEFAULT_RANGE_DAYS;
        const millisecondsToSubtract = days * 24 * 60 * 60 * 1000;
        startDate = new Date(now.getTime() - millisecondsToSubtract);
        console.log(`[Analytics] Calculated startDate: ${startDate.toISOString()} (subtracted ${days} days, ${millisecondsToSubtract} ms)`);
      }

      // Ensure dates are reasonable - if now is in the future or startDate > now, fix it
      const actualNow = new Date();
      if (now.getTime() > actualNow.getTime() + 24 * 60 * 60 * 1000) {
        // If 'now' is more than 1 day in the future, use actual current date
        console.warn(`[Analytics] WARNING: 'now' date (${now.toISOString()}) is in the future. Using actual current date: ${actualNow.toISOString()}`);
        now = actualNow;
      }

      if (startDate > now) {
        console.warn(`[Analytics] WARNING: startDate (${startDate.toISOString()}) is greater than now (${now.toISOString()}). Using fallback.`);
        const fallbackDays = rangeDaysParam ?? DEFAULT_RANGE_DAYS;
        startDate = new Date(now.getTime() - fallbackDays * 24 * 60 * 60 * 1000);
        console.log(`[Analytics] Fallback startDate: ${startDate.toISOString()}`);
      }

      // Ensure startDate is not too far in the past (more than 1 year ago) - might indicate date issues
      const oneYearAgo = new Date(actualNow.getTime() - 365 * 24 * 60 * 60 * 1000);
      if (startDate < oneYearAgo) {
        console.warn(`[Analytics] WARNING: startDate (${startDate.toISOString()}) is more than 1 year ago. Using 30 days ago instead.`);
        startDate = new Date(actualNow.getTime() - 30 * 24 * 60 * 60 * 1000);
        now = actualNow;
      }
    } else {
      // No date filter - use current date for range display only
      now = new Date();
      startDate = null; // Will be set to a very old date or omitted from query
      console.log(`[Analytics] No date filter provided - showing all data`);
    }

    // Build match stage - only include date filter if user provided one
    const matchStage: {
      ownerId: string;
      createdAt?: { $gte: Date; $lte: Date };
    } = {
      ownerId: user.id,
    };

    if (hasDateFilter && startDate && now) {
      matchStage.createdAt = {
        $gte: startDate,
        $lte: now,
      };
    }

    // Debug: Log the query parameters
    if (hasDateFilter && startDate && now) {
      console.log(`[Analytics] Querying events for ownerId: ${user.id}, range: ${startDate.toISOString()} to ${now.toISOString()}`);
    } else {
      console.log(`[Analytics] Querying ALL events for ownerId: ${user.id} (no date filter)`);
    }
    console.log(`[Analytics] Match stage:`, JSON.stringify(matchStage, null, 2));
    
    // First, let's check if there are ANY events for this user (without date filter)
    const totalEventsCount = await db.playlistEngagementEvent.count({
      where: { ownerId: user.id },
    });
    console.log(`[Analytics] Total events for ownerId ${user.id} (no date filter): ${totalEventsCount}`);
    
    // Check events in the date range (if date filter is applied)
    const rangeEventsCount = hasDateFilter && startDate && now
      ? await db.playlistEngagementEvent.count({
          where: {
            ownerId: user.id,
            createdAt: {
              gte: startDate,
              lte: now,
            },
          },
        })
      : totalEventsCount; // If no date filter, same as total
    console.log(`[Analytics] Events in date range: ${rangeEventsCount}`);
    
    // Sample a few events to see their structure
    const sampleEvents = await db.playlistEngagementEvent.findMany({
      where: { ownerId: user.id },
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ownerId: true,
        type: true,
        createdAt: true,
        playlistId: true,
      },
    });
    console.log(`[Analytics] Sample events:`, JSON.stringify(sampleEvents, null, 2));

    const [
      totalsRawResult,
      trendRawResult,
      topPlaylistsRawResult,
      sourcesRawResult,
      uniqueVisitorsRawResult,
    ] = await Promise.all([
      db.playlistEngagementEvent.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
            },
          },
        ],
      }),
      db.playlistEngagementEvent.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                  },
                },
                type: "$type",
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.day": 1 } },
        ],
      }),
      db.playlistEngagementEvent.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          {
            $group: {
              _id: { playlistId: "$playlistId", type: "$type" },
              count: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: "$_id.playlistId",
              counts: {
                $push: {
                  type: "$_id.type",
                  count: "$count",
                },
              },
              total: { $sum: "$count" },
            },
          },
          { $sort: { total: -1 } },
          { $limit: 10 },
        ],
      }),
      db.playlistEngagementEvent.aggregateRaw({
        pipeline: [
          { $match: { ...matchStage, source: { $ne: null } } },
          {
            $group: {
              _id: "$source",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ],
      }),
      db.playlistEngagementEvent.aggregateRaw({
        pipeline: [
          {
            $match: {
              ...matchStage,
              type: PlaylistEngagementType.VISIT,
              visitorToken: { $ne: null },
            },
          },
          {
            $group: {
              _id: "$visitorToken",
            },
          },
          {
            $count: "count",
          },
        ],
      }),
    ]);

    const totalsRaw = asArray<TotalsRawRow>(totalsRawResult);
    const trendRaw = asArray<TrendRawRow>(trendRawResult);
    const topPlaylistsRaw = asArray<LeaderboardRawRow>(topPlaylistsRawResult);
    const sourcesRaw = asArray<SourceRawRow>(sourcesRawResult);
    const uniqueVisitorsRaw = asArray<UniqueVisitorsRawRow>(
      uniqueVisitorsRawResult
    );

    // Debug: Log all raw aggregation results
    console.log(`[Analytics] Raw totals results:`, JSON.stringify(totalsRaw, null, 2));
    console.log(`[Analytics] Raw trend results:`, JSON.stringify(trendRaw, null, 2));
    console.log(`[Analytics] Raw topPlaylists results:`, JSON.stringify(topPlaylistsRaw, null, 2));
    console.log(`[Analytics] Raw sources results:`, JSON.stringify(sourcesRaw, null, 2));
    console.log(`[Analytics] Raw uniqueVisitors results:`, JSON.stringify(uniqueVisitorsRaw, null, 2));

    const totals = totalsRaw.reduce(
      (acc, row) => {
        const type = typeof row._id === "string" ? row._id : null;
        const count = toNumber(row.count);

        if (type === PlaylistEngagementType.SHARE) {
          acc.shares = count;
        } else if (type === PlaylistEngagementType.VISIT) {
          acc.visits = count;
        }

        acc.totalEngagement += count;
        return acc;
      },
      { shares: 0, visits: 0, totalEngagement: 0 }
    );

    // Debug: Log computed totals
    console.log(`[Analytics] Computed totals:`, totals);

    const uniqueVisitors = uniqueVisitorsRaw.length
      ? toNumber(uniqueVisitorsRaw[0]?.count)
      : 0;

    const trendMap = new Map<
      string,
      { date: string; shares: number; visits: number }
    >();

    trendRaw.forEach((row) => {
      const day = row._id?.day;
      if (!day) return;

      const existing =
        trendMap.get(day) ?? { date: day, shares: 0, visits: 0 };
      const type = row._id?.type;
      const count = toNumber(row.count);

      if (type === PlaylistEngagementType.SHARE) {
        existing.shares += count;
      } else if (type === PlaylistEngagementType.VISIT) {
        existing.visits += count;
      }

      trendMap.set(day, existing);
    });

    const trend = Array.from(trendMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const leaderboardIntermediate = topPlaylistsRaw.map((row) => {
      const playlistId = toObjectIdString(row._id ?? null);
      if (!playlistId) {
        return null;
      }

      const countsArray = Array.isArray(row.counts) ? row.counts : [];

      let shares = 0;
      let visits = 0;

      countsArray.forEach((item) => {
        const type = item.type;
        const count = toNumber(item.count);
        if (type === PlaylistEngagementType.SHARE) {
          shares += count;
        } else if (type === PlaylistEngagementType.VISIT) {
          visits += count;
        }
      });

      const total = shares + visits;
      return {
        playlistId,
        shares,
        visits,
        total,
      };
    });

    const leaderboard = leaderboardIntermediate
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => b.total - a.total);

    const playlistIds = leaderboard.map((entry) => entry.playlistId);
    const playlistDetails = playlistIds.length
      ? await db.playlist.findMany({
          where: { id: { in: playlistIds } },
          select: { id: true, name: true, updatedAt: true },
        })
      : [];

    const playlistNameMap = new Map(
      playlistDetails.map((playlist) => [playlist.id, playlist])
    );

    const leaderboardWithNames = leaderboard.map((entry) => {
      const details = playlistNameMap.get(entry.playlistId);
      return {
        playlistId: entry.playlistId,
        name: details?.name ?? "Unknown playlist",
        shares: entry.shares,
        visits: entry.visits,
        total: entry.total,
        updatedAt: details?.updatedAt ?? null,
      };
    });

    const sourceBreakdown = sourcesRaw.map((row) => ({
      source: typeof row._id === "string" ? row._id : "unknown",
      count: toNumber(row.count),
    }));

    const topPlaylist = leaderboardWithNames[0] ?? null;

    const responsePayload = {
      totals: {
        shares: totals.shares,
        visits: totals.visits,
        uniqueVisitors,
        totalEngagement: totals.totalEngagement,
        topPlaylist: topPlaylist
          ? {
              id: topPlaylist.playlistId,
              name: topPlaylist.name,
              visits: topPlaylist.visits,
              shares: topPlaylist.shares,
            }
          : null,
      },
      trend,
      leaderboard: leaderboardWithNames,
      sources: sourceBreakdown,
      range: hasDateFilter && startDate && now
        ? {
            start: startDate.toISOString(),
            end: now.toISOString(),
          }
        : {
            start: null, // All time - no start date
            end: new Date().toISOString(), // Current date as end
          },
    };

    // Debug: Log final response payload
    console.log(`[Analytics] Final response payload:`, JSON.stringify(responsePayload, null, 2));

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Playlist analytics summary error:", error);
    return NextResponse.json(
      { error: "Failed to load playlist analytics summary" },
      { status: 500 }
    );
  }
}


