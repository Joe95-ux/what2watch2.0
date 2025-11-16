import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import DiaryDetailContent from "@/components/diary/diary-detail-content";

export default async function DiaryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; filmTitle: string }>;
  searchParams: Promise<{ tmdbId?: string; mediaType?: string; logId?: string }>;
}) {
  const { username, filmTitle } = await params;
  const { tmdbId, mediaType, logId } = await searchParams;

  // Find user by username
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  });

  if (!user || !user.username) {
    notFound();
  }

  // Find the viewing log
  let log;
  if (logId) {
    log = await db.viewingLog.findFirst({
      where: {
        id: logId,
        userId: user.id,
      },
    });
  } else if (tmdbId && mediaType) {
    log = await db.viewingLog.findFirst({
      where: {
        userId: user.id,
        tmdbId: parseInt(tmdbId, 10),
        mediaType: mediaType as "movie" | "tv",
      },
      orderBy: {
        watchedAt: "desc",
      },
    });
  }

  if (!log) {
    notFound();
  }

  // Transform Prisma result to match ViewingLog interface
  const viewingLog: {
    id: string;
    userId: string;
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    releaseDate: string | null;
    firstAirDate: string | null;
    watchedAt: string;
    notes: string | null;
    rating: number | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  } = {
    id: log.id,
    userId: log.userId,
    tmdbId: log.tmdbId,
    mediaType: log.mediaType as "movie" | "tv",
    title: log.title,
    posterPath: log.posterPath,
    backdropPath: log.backdropPath,
    releaseDate: log.releaseDate,
    firstAirDate: log.firstAirDate,
    watchedAt: log.watchedAt.toISOString(),
    notes: log.notes,
    rating: log.rating,
    tags: (log as typeof log & { tags?: string[] }).tags || [],
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };

  // Create properly typed user object
  const typedUser = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };

  return <DiaryDetailContent log={viewingLog} user={typedUser} />;
}

