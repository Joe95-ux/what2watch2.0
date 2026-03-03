import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

interface UnifiedLogEntry {
  id: string;
  watchedAt: string;
  rating?: number | null;
  notes?: string | null;
  tags?: string[];
  type: "viewingLog" | "episodeLog";
  // For viewingLog entries
  viewingLogId?: string;
  title?: string;
  // For episodeLog entries
  episodeLogId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeNumbers?: number[]; // For grouped episodes (episode numbers, not IDs)
}

// GET - Fetch all viewing logs for a specific movie/TV show
// For TV shows, also fetches EpisodeViewingLog entries and merges them
export async function GET(request: NextRequest): Promise<NextResponse<{ logs: UnifiedLogEntry[] } | { error: string }>> {
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
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = searchParams.get("mediaType");

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
    }

    const parsedTmdbId = parseInt(tmdbId, 10);
    const parsedMediaType = mediaType as "movie" | "tv";

    // Fetch ViewingLog entries
    const viewingLogs = await db.viewingLog.findMany({
      where: {
        userId: user.id,
        tmdbId: parsedTmdbId,
        mediaType: parsedMediaType,
      },
      orderBy: {
        watchedAt: "desc",
      },
    });

    // For TV shows, also fetch EpisodeViewingLog entries
    let episodeLogs: Array<{
      id: string;
      episodeId: number;
      seasonNumber: number;
      episodeNumber: number;
      watchedAt: Date;
    }> = [];

    if (parsedMediaType === "tv") {
      const rawEpisodeLogs = await db.episodeViewingLog.findMany({
        where: {
          userId: user.id,
          tvShowTmdbId: parsedTmdbId,
        },
        orderBy: {
          watchedAt: "desc",
        },
        select: {
          id: true,
          episodeId: true,
          seasonNumber: true,
          episodeNumber: true,
          watchedAt: true,
        },
      });
      episodeLogs = rawEpisodeLogs;
    }

    // Convert ViewingLog entries to unified format
    const unifiedLogs: UnifiedLogEntry[] = viewingLogs.map((log) => ({
      id: log.id,
      watchedAt: log.watchedAt.toISOString(),
      rating: log.rating,
      notes: log.notes,
      tags: log.tags,
      type: "viewingLog" as const,
      viewingLogId: log.id,
      title: log.title,
    }));

    // Group episode logs by date and season
    // Structure: dateKey -> seasonNumber -> episodeLog entries
    const episodeLogsByDate = new Map<string, Map<number, typeof episodeLogs>>();
    
    for (const episodeLog of episodeLogs) {
      const dateKey = episodeLog.watchedAt.toISOString().split("T")[0]; // YYYY-MM-DD
      
      if (!episodeLogsByDate.has(dateKey)) {
        episodeLogsByDate.set(dateKey, new Map());
      }
      
      const dateMap = episodeLogsByDate.get(dateKey)!;
      if (!dateMap.has(episodeLog.seasonNumber)) {
        dateMap.set(episodeLog.seasonNumber, []);
      }
      
      dateMap.get(episodeLog.seasonNumber)!.push(episodeLog);
    }

    // Check if episode logs match existing ViewingLog entries
    // If a ViewingLog title contains episode info (e.g., "Foundation S1E1"), 
    // we'll prefer the ViewingLog entry and skip creating a duplicate episode log entry
    const episodeLogIdsInViewingLogs = new Set<string>();
    
    for (const viewingLog of viewingLogs) {
      // Check if title contains episode pattern like "S1E1" or "S1 E1"
      const episodePattern = /S(\d+)\s*E(\d+)/i;
      const match = viewingLog.title.match(episodePattern);
      
      if (match) {
        const seasonNum = parseInt(match[1], 10);
        const episodeNum = parseInt(match[2], 10);
        
        // Find matching episode log
        const matchingEpisodeLog = episodeLogs.find(
          (el) => el.seasonNumber === seasonNum && el.episodeNumber === episodeNum
        );
        
        if (matchingEpisodeLog) {
          episodeLogIdsInViewingLogs.add(matchingEpisodeLog.id);
        }
      }
    }

    // Convert grouped episode logs to unified format
    for (const [dateKey, seasonMap] of episodeLogsByDate.entries()) {
      for (const [seasonNumber, episodeLogsForSeason] of seasonMap.entries()) {
        // Filter out episode logs that are already represented in ViewingLog entries
        const filteredEpisodeLogs = episodeLogsForSeason.filter(
          (el) => !episodeLogIdsInViewingLogs.has(el.id)
        );
        
        if (filteredEpisodeLogs.length === 0) {
          continue;
        }

        // Sort episodes by episode number
        const sortedEpisodes = [...filteredEpisodeLogs].sort((a, b) => a.episodeNumber - b.episodeNumber);
        const firstEpisodeLog = sortedEpisodes[0];
        const episodeNumbers = sortedEpisodes.map((e) => e.episodeNumber);

        // Determine if it's a single episode or multiple
        const isSingleEpisode = sortedEpisodes.length === 1;

        unifiedLogs.push({
          id: `episode-${firstEpisodeLog.id}`,
          watchedAt: firstEpisodeLog.watchedAt.toISOString(),
          rating: null,
          notes: null,
          tags: [],
          type: "episodeLog" as const,
          episodeLogId: firstEpisodeLog.id,
          seasonNumber,
          episodeNumber: isSingleEpisode ? episodeNumbers[0] : undefined,
          episodeNumbers: !isSingleEpisode ? episodeNumbers : undefined,
        });
      }
    }

    // Sort all unified logs by watchedAt (descending)
    unifiedLogs.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());

    return NextResponse.json({ logs: unifiedLogs });
  } catch (error) {
    console.error("Get viewing logs by content API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch viewing logs";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
