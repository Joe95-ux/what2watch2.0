import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma, ListEngagementType } from "@prisma/client";

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

    const hasDateFilter = !!(rangeDaysParam || startParam || endParam);

    let startDate: Date | null = null;
    let now: Date | null = null;

    if (hasDateFilter) {
      now = endParam ? new Date(endParam) : new Date();
      if (Number.isNaN(now.getTime())) {
        return NextResponse.json(
          { error: "Invalid endDate parameter" },
          { status: 400 }
        );
      }

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
      }

      const actualNow = new Date();
      if (now.getTime() > actualNow.getTime() + 24 * 60 * 60 * 1000) {
        now = actualNow;
      }

      if (startDate > now) {
        const fallbackDays = rangeDaysParam ?? DEFAULT_RANGE_DAYS;
        startDate = new Date(now.getTime() - fallbackDays * 24 * 60 * 60 * 1000);
      }

      const oneYearAgo = new Date(actualNow.getTime() - 365 * 24 * 60 * 60 * 1000);
      if (startDate < oneYearAgo) {
        startDate = new Date(actualNow.getTime() - 30 * 24 * 60 * 60 * 1000);
        now = actualNow;
      }
    } else {
      now = new Date();
      startDate = null;
    }

    const matchStage: {
      ownerId: { $oid: string };
      createdAt?: { $gte: { $date: string }; $lte: { $date: string } };
    } = {
      ownerId: { $oid: user.id },
    };

    if (hasDateFilter && startDate && now) {
      matchStage.createdAt = {
        $gte: { $date: startDate.toISOString() },
        $lte: { $date: now.toISOString() },
      };
    }

    const [
      totalsRawResult,
      trendRawResult,
      topListsRawResult,
      sourcesRawResult,
      uniqueVisitorsRawResult,
    ] = await Promise.all([
      db.listEngagementEvent.aggregateRaw({
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
      db.listEngagementEvent.aggregateRaw({
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
      db.listEngagementEvent.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          {
            $group: {
              _id: { listId: "$listId", type: "$type" },
              count: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: "$_id.listId",
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
      db.listEngagementEvent.aggregateRaw({
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
      db.listEngagementEvent.aggregateRaw({
        pipeline: [
          {
            $match: {
              ...matchStage,
              type: ListEngagementType.VISIT,
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
    const topListsRaw = asArray<LeaderboardRawRow>(topListsRawResult);
    const sourcesRaw = asArray<SourceRawRow>(sourcesRawResult);
    const uniqueVisitorsRaw = asArray<UniqueVisitorsRawRow>(
      uniqueVisitorsRawResult
    );

    const totals = totalsRaw.reduce(
      (acc, row) => {
        const type = typeof row._id === "string" ? row._id : null;
        const count = toNumber(row.count);

        if (type === ListEngagementType.SHARE) {
          acc.shares = count;
        } else if (type === ListEngagementType.VISIT) {
          acc.visits = count;
        }

        acc.totalEngagement += count;
        return acc;
      },
      { shares: 0, visits: 0, totalEngagement: 0 }
    );

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

      if (type === ListEngagementType.SHARE) {
        existing.shares += count;
      } else if (type === ListEngagementType.VISIT) {
        existing.visits += count;
      }

      trendMap.set(day, existing);
    });

    const trend = Array.from(trendMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const leaderboardIntermediate = topListsRaw.map((row) => {
      const listId = toObjectIdString(row._id ?? null);
      if (!listId) {
        return null;
      }

      const countsArray = Array.isArray(row.counts) ? row.counts : [];

      let shares = 0;
      let visits = 0;

      countsArray.forEach((item) => {
        const type = item.type;
        const count = toNumber(item.count);
        if (type === ListEngagementType.SHARE) {
          shares += count;
        } else if (type === ListEngagementType.VISIT) {
          visits += count;
        }
      });

      const total = shares + visits;
      return {
        listId,
        shares,
        visits,
        total,
      };
    });

    const leaderboard = leaderboardIntermediate
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => b.total - a.total);

    const listIds = leaderboard.map((entry) => entry.listId);
    const listDetails = listIds.length
      ? await db.list.findMany({
          where: { id: { in: listIds } },
          select: { id: true, name: true, updatedAt: true },
        })
      : [];

    const listNameMap = new Map(
      listDetails.map((list) => [list.id, list])
    );

    const leaderboardWithNames = leaderboard.map((entry) => {
      const details = listNameMap.get(entry.listId);
      return {
        listId: entry.listId,
        name: details?.name ?? "Unknown list",
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

    const topList = leaderboardWithNames[0] ?? null;

    const responsePayload = {
      totals: {
        shares: totals.shares,
        visits: totals.visits,
        uniqueVisitors,
        totalEngagement: totals.totalEngagement,
        topList: topList
          ? {
              id: topList.listId,
              name: topList.name,
              visits: topList.visits,
              shares: topList.shares,
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
            start: null,
            end: new Date().toISOString(),
          },
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("List analytics summary error:", error);
    return NextResponse.json(
      { error: "Failed to load list analytics summary" },
      { status: 500 }
    );
  }
}

