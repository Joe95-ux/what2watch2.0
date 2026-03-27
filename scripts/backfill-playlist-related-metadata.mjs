import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EDITORIAL_TAG = "__editorial__";
const ITEM_TAG_PREFIX = "__item__:";
const GENRE_TAG_PREFIX = "__genre__:";
const BATCH_SIZE = 50;

function isSystemTag(tag) {
  return (
    tag === EDITORIAL_TAG ||
    tag.startsWith(ITEM_TAG_PREFIX) ||
    tag.startsWith(GENRE_TAG_PREFIX)
  );
}

function stripSystemTags(tags) {
  return (tags || []).filter((tag) => !isSystemTag(tag));
}

function toItemTag(mediaType, tmdbId) {
  return `${ITEM_TAG_PREFIX}${mediaType}:${tmdbId}`;
}

function toGenreTag(genreId) {
  return `${GENRE_TAG_PREFIX}${genreId}`;
}

async function fetchGenresForItem(mediaType, tmdbId, token, cache) {
  const key = `${mediaType}:${tmdbId}`;
  if (cache.has(key)) return cache.get(key);

  const endpoint =
    mediaType === "movie"
      ? `https://api.themoviedb.org/3/movie/${tmdbId}`
      : `https://api.themoviedb.org/3/tv/${tmdbId}`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      cache.set(key, []);
      return [];
    }
    const json = await res.json();
    const genreIds = Array.isArray(json?.genres)
      ? json.genres.map((g) => g.id).filter((id) => Number.isInteger(id))
      : [];
    cache.set(key, genreIds);
    return genreIds;
  } catch {
    cache.set(key, []);
    return [];
  }
}

async function buildMetadataTags(items, token, genreCache) {
  const itemTagSet = new Set();
  const genreTagSet = new Set();

  for (const item of items) {
    itemTagSet.add(toItemTag(item.mediaType, item.tmdbId));
    const genres = await fetchGenresForItem(item.mediaType, item.tmdbId, token, genreCache);
    for (const gid of genres) {
      genreTagSet.add(toGenreTag(gid));
    }
  }

  return [...itemTagSet, ...genreTagSet];
}

async function main() {
  const token = process.env.MOVIEDB_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MOVIEDB_ACCESS_TOKEN is required");
  }

  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");

  const totalPlaylists = await prisma.playlist.count();
  console.log(`Starting related metadata backfill for ${totalPlaylists} playlists`);
  if (dryRun) console.log("Mode: dry-run (no writes)");
  if (force) console.log("Mode: force (updates even when unchanged)");

  let cursor = null;
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  const genreCache = new Map();

  while (true) {
    const playlists = await prisma.playlist.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        tags: true,
        items: {
          select: {
            tmdbId: true,
            mediaType: true,
          },
        },
      },
    });

    if (playlists.length === 0) break;

    for (const playlist of playlists) {
      processed += 1;
      const metadataTags = await buildMetadataTags(playlist.items, token, genreCache);
      const preservedTags = stripSystemTags(playlist.tags || []);
      const nextTags = [...preservedTags, ...metadataTags];

      const prev = JSON.stringify((playlist.tags || []).slice().sort());
      const next = JSON.stringify(nextTags.slice().sort());
      const changed = prev !== next;

      if (!changed && !force) {
        skipped += 1;
        continue;
      }

      if (!dryRun) {
        await prisma.playlist.update({
          where: { id: playlist.id },
          data: { tags: nextTags },
        });
      }
      updated += 1;
    }

    cursor = playlists[playlists.length - 1].id;
    console.log(
      `Progress: ${processed}/${totalPlaylists} processed, ${updated} updated, ${skipped} skipped`,
    );
  }

  console.log("Backfill completed");
  console.log({ totalPlaylists, processed, updated, skipped, dryRun, force });
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
