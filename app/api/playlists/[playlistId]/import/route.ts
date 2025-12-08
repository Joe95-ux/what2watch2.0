import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { parseAndAnalyzeCSV, validateCSV, type ParsedCSV } from "@/lib/csv-import";
import { findByExternalId } from "@/lib/tmdb";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb";

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  warnings: Array<{ row: number; warning: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
): Promise<NextResponse<ImportResult | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { playlistId } = await params;

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify playlist exists and user owns it
    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
      select: { userId: true },
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    if (playlist.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const duplicateAction = formData.get("duplicateAction") as string || "skip";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file content
    const csvContent = await file.text();

    // Parse CSV
    let parsed: ParsedCSV;
    try {
      parsed = parseAndAnalyzeCSV(csvContent);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to parse CSV file" },
        { status: 400 }
      );
    }

    // Validate CSV
    const validation = validateCSV(parsed);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: `CSV validation failed: ${validation.errors.join(", ")}` },
        { status: 400 }
      );
    }

    const results: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      warnings: [],
    };

    // Process rows based on detected source
    if (parsed.detectedSource === "what2watch") {
      await processWhat2WatchPlaylistImport(parsed, playlistId, user.id, duplicateAction, results);
    } else if (parsed.detectedSource === "imdb") {
      await processIMDbPlaylistImport(parsed, playlistId, user.id, duplicateAction, results);
    } else {
      await processGenericPlaylistImport(parsed, playlistId, user.id, duplicateAction, results);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Import playlist API error:", error);
    return NextResponse.json(
      { error: "Failed to import playlist" },
      { status: 500 }
    );
  }
}

/**
 * Process What2Watch format import for playlists
 */
async function processWhat2WatchPlaylistImport(
  parsed: ParsedCSV,
  playlistId: string,
  userId: string,
  duplicateAction: string,
  results: ImportResult
) {
  const mapping = parsed.columnMapping;

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const rowNum = i + 2;

    try {
      const title = row[mapping.title!]?.trim();
      const typeStr = row[mapping.type!]?.trim().toLowerCase();
      const tmdbIdStr = row[mapping.tmdbId!]?.trim();
      const orderStr = row[mapping.order!]?.trim();
      const note = row[mapping.note!]?.trim() || null;

      if (!title || !typeStr || !tmdbIdStr) {
        results.errors.push({
          row: rowNum,
          error: "Missing required fields: title, type, or tmdbId",
        });
        results.skipped++;
        continue;
      }

      const mediaType = typeStr.includes("movie") ? "movie" : typeStr.includes("tv") ? "tv" : null;
      if (!mediaType) {
        results.errors.push({
          row: rowNum,
          error: `Invalid type: ${typeStr}. Must be 'movie' or 'tv'`,
        });
        results.skipped++;
        continue;
      }

      const tmdbId = parseInt(tmdbIdStr, 10);
      if (isNaN(tmdbId)) {
        results.errors.push({
          row: rowNum,
          error: `Invalid TMDB ID: ${tmdbIdStr}`,
        });
        results.skipped++;
        continue;
      }

      const order = orderStr ? parseInt(orderStr, 10) : null;
      if (orderStr && isNaN(order!)) {
        results.warnings.push({
          row: rowNum,
          warning: `Invalid order value: ${orderStr}. Will be assigned automatically.`,
        });
      }

      // Check for duplicate
      const existing = await db.playlistItem.findFirst({
        where: {
          playlistId,
          tmdbId,
          mediaType,
        },
      });

      if (existing) {
        if (duplicateAction === "skip") {
          results.skipped++;
          continue;
        } else if (duplicateAction === "update") {
          await db.playlistItem.update({
            where: { id: existing.id },
            data: {
              title,
              note,
              releaseDate: mediaType === "movie" ? row[mapping.releaseDate!]?.trim() || null : null,
              firstAirDate: mediaType === "tv" ? row[mapping.releaseDate!]?.trim() || null : null,
              order: order || existing.order,
            },
          });
          results.imported++;
          continue;
        }
      }

      // Get current max order
      const maxOrderItem = await db.playlistItem.findFirst({
        where: { playlistId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      const nextOrder = order || (maxOrderItem?.order ? maxOrderItem.order + 1 : 1);

      // Fetch poster/backdrop from TMDB
      let posterPath: string | null = null;
      let backdropPath: string | null = null;
      try {
        if (mediaType === "movie") {
          const details = await getMovieDetails(tmdbId);
          posterPath = details.poster_path;
          backdropPath = details.backdrop_path;
        } else {
          const details = await getTVDetails(tmdbId);
          posterPath = details.poster_path;
          backdropPath = details.backdrop_path;
        }
      } catch (error) {
        results.warnings.push({
          row: rowNum,
          warning: `Could not fetch poster/backdrop for ${title}`,
        });
      }

      // Create playlist item
      await db.playlistItem.create({
        data: {
          playlistId,
          tmdbId,
          mediaType,
          title,
          posterPath,
          backdropPath,
          releaseDate: mediaType === "movie" ? row[mapping.releaseDate!]?.trim() || null : null,
          firstAirDate: mediaType === "tv" ? row[mapping.releaseDate!]?.trim() || null : null,
          note,
          order: nextOrder,
        },
      });

      results.imported++;
    } catch (error) {
      results.errors.push({
        row: rowNum,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      results.skipped++;
    }
  }
}

/**
 * Process IMDb format import for playlists
 */
async function processIMDbPlaylistImport(
  parsed: ParsedCSV,
  playlistId: string,
  userId: string,
  duplicateAction: string,
  results: ImportResult
) {
  const mapping = parsed.columnMapping;

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const rowNum = i + 2;

    try {
      const imdbId = row[mapping.imdbConst!]?.trim();
      const note = row[mapping.note!]?.trim() || null;
      const orderStr = row[mapping.order!]?.trim();

      if (!imdbId || !imdbId.startsWith("tt")) {
        results.errors.push({
          row: rowNum,
          error: `Invalid IMDb ID: ${imdbId}`,
        });
        results.skipped++;
        continue;
      }

      // Lookup TMDB ID from IMDb ID
      let tmdbId: number | null = null;
      let mediaType: "movie" | "tv" | null = null;
      let title: string | null = null;
      let posterPath: string | null = null;
      let backdropPath: string | null = null;
      let releaseDate: string | null = null;
      let firstAirDate: string | null = null;

      try {
        const findResult = await findByExternalId(imdbId, "imdb_id");

        if (findResult.movie_results.length > 0) {
          const movie = findResult.movie_results[0];
          tmdbId = movie.id;
          mediaType = "movie";
          title = movie.title;
          posterPath = movie.poster_path;
          backdropPath = movie.backdrop_path;
          releaseDate = movie.release_date || null;
        } else if (findResult.tv_results.length > 0) {
          const tv = findResult.tv_results[0];
          tmdbId = tv.id;
          mediaType = "tv";
          title = tv.name;
          posterPath = tv.poster_path;
          backdropPath = tv.backdrop_path;
          firstAirDate = tv.first_air_date || null;
        } else {
          results.errors.push({
            row: rowNum,
            error: `No TMDB match found for IMDb ID: ${imdbId}`,
          });
          results.skipped++;
          continue;
        }
      } catch (error) {
        results.errors.push({
          row: rowNum,
          error: `Failed to lookup TMDB ID for IMDb ID ${imdbId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
        results.skipped++;
        continue;
      }

      if (!tmdbId || !mediaType || !title) {
        results.errors.push({
          row: rowNum,
          error: `Could not determine TMDB ID, type, or title for IMDb ID: ${imdbId}`,
        });
        results.skipped++;
        continue;
      }

      // Check for duplicate
      const existing = await db.playlistItem.findFirst({
        where: {
          playlistId,
          tmdbId,
          mediaType,
        },
      });

      if (existing) {
        if (duplicateAction === "skip") {
          results.skipped++;
          continue;
        } else if (duplicateAction === "update") {
          await db.playlistItem.update({
            where: { id: existing.id },
            data: {
              title,
              note,
              order: orderStr ? parseInt(orderStr, 10) : existing.order,
            },
          });
          results.imported++;
          continue;
        }
      }

      // Get current max order
      const maxOrderItem = await db.playlistItem.findFirst({
        where: { playlistId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      const nextOrder = orderStr ? parseInt(orderStr, 10) : (maxOrderItem?.order ? maxOrderItem.order + 1 : 1);

      // Create playlist item
      await db.playlistItem.create({
        data: {
          playlistId,
          tmdbId,
          mediaType,
          title,
          posterPath,
          backdropPath,
          releaseDate,
          firstAirDate,
          note,
          order: nextOrder,
        },
      });

      results.imported++;
    } catch (error) {
      results.errors.push({
        row: rowNum,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      results.skipped++;
    }
  }
}

/**
 * Process generic format import for playlists
 */
async function processGenericPlaylistImport(
  parsed: ParsedCSV,
  playlistId: string,
  userId: string,
  duplicateAction: string,
  results: ImportResult
) {
  const mapping = parsed.columnMapping;

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const rowNum = i + 2;

    try {
      let tmdbId: number | null = null;
      let mediaType: "movie" | "tv" | null = null;
      let title: string | null = null;
      let posterPath: string | null = null;
      let backdropPath: string | null = null;
      let releaseDate: string | null = null;
      let firstAirDate: string | null = null;

      // Check if we have TMDB ID
      if (mapping.tmdbId && row[mapping.tmdbId]) {
        tmdbId = parseInt(row[mapping.tmdbId].trim(), 10);
        if (isNaN(tmdbId)) {
          results.errors.push({
            row: rowNum,
            error: `Invalid TMDB ID: ${row[mapping.tmdbId]}`,
          });
          results.skipped++;
          continue;
        }

        if (mapping.type && row[mapping.type]) {
          const typeStr = row[mapping.type].trim().toLowerCase();
          mediaType = typeStr.includes("movie") ? "movie" : typeStr.includes("tv") ? "tv" : null;
        }

        try {
          if (mediaType === "movie") {
            const details = await getMovieDetails(tmdbId);
            title = details.title;
            posterPath = details.poster_path;
            backdropPath = details.backdrop_path;
            releaseDate = details.release_date || null;
          } else if (mediaType === "tv") {
            const details = await getTVDetails(tmdbId);
            title = details.name;
            posterPath = details.poster_path;
            backdropPath = details.backdrop_path;
            firstAirDate = details.first_air_date || null;
          } else {
            try {
              const details = await getMovieDetails(tmdbId);
              title = details.title;
              mediaType = "movie";
              posterPath = details.poster_path;
              backdropPath = details.backdrop_path;
              releaseDate = details.release_date || null;
            } catch {
              const details = await getTVDetails(tmdbId);
              title = details.name;
              mediaType = "tv";
              posterPath = details.poster_path;
              backdropPath = details.backdrop_path;
              firstAirDate = details.first_air_date || null;
            }
          }
        } catch (error) {
          results.errors.push({
            row: rowNum,
            error: `Failed to fetch details for TMDB ID ${tmdbId}`,
          });
          results.skipped++;
          continue;
        }
      }
      // Try IMDb ID lookup
      else if (mapping.imdbId && row[mapping.imdbId]) {
        const imdbId = row[mapping.imdbId].trim();
        if (!imdbId.startsWith("tt")) {
          results.errors.push({
            row: rowNum,
            error: `Invalid IMDb ID: ${imdbId}`,
          });
          results.skipped++;
          continue;
        }

        try {
          const findResult = await findByExternalId(imdbId, "imdb_id");
          if (findResult.movie_results.length > 0) {
            const movie = findResult.movie_results[0];
            tmdbId = movie.id;
            mediaType = "movie";
            title = movie.title;
            posterPath = movie.poster_path;
            backdropPath = movie.backdrop_path;
            releaseDate = movie.release_date || null;
          } else if (findResult.tv_results.length > 0) {
            const tv = findResult.tv_results[0];
            tmdbId = tv.id;
            mediaType = "tv";
            title = tv.name;
            posterPath = tv.poster_path;
            backdropPath = tv.backdrop_path;
            firstAirDate = tv.first_air_date || null;
          } else {
            results.errors.push({
              row: rowNum,
              error: `No TMDB match found for IMDb ID: ${imdbId}`,
            });
            results.skipped++;
            continue;
          }
        } catch (error) {
          results.errors.push({
            row: rowNum,
            error: `Failed to lookup TMDB ID for IMDb ID ${imdbId}`,
          });
          results.skipped++;
          continue;
        }
      } else {
        results.errors.push({
          row: rowNum,
          error: "Missing required identifier: TMDB ID or IMDb ID",
        });
        results.skipped++;
        continue;
      }

      if (!tmdbId || !mediaType || !title) {
        results.errors.push({
          row: rowNum,
          error: "Could not determine required fields",
        });
        results.skipped++;
        continue;
      }

      const note = row[mapping.note!]?.trim() || null;
      const orderStr = row[mapping.order!]?.trim();

      // Check for duplicate
      const existing = await db.playlistItem.findFirst({
        where: {
          playlistId,
          tmdbId,
          mediaType,
        },
      });

      if (existing) {
        if (duplicateAction === "skip") {
          results.skipped++;
          continue;
        } else if (duplicateAction === "update") {
          await db.playlistItem.update({
            where: { id: existing.id },
            data: {
              title,
              note,
              order: orderStr ? parseInt(orderStr, 10) : existing.order,
            },
          });
          results.imported++;
          continue;
        }
      }

      // Get current max order
      const maxOrderItem = await db.playlistItem.findFirst({
        where: { playlistId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      const nextOrder = orderStr ? parseInt(orderStr, 10) : (maxOrderItem?.order ? maxOrderItem.order + 1 : 1);

      // Create playlist item
      await db.playlistItem.create({
        data: {
          playlistId,
          tmdbId,
          mediaType,
          title,
          posterPath,
          backdropPath,
          releaseDate,
          firstAirDate,
          note,
          order: nextOrder,
        },
      });

      results.imported++;
    } catch (error) {
      results.errors.push({
        row: rowNum,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      results.skipped++;
    }
  }
}

