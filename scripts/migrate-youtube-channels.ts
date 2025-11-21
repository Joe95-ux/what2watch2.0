/**
 * Migration script to push existing YouTube channel IDs from lib/youtube-channels.ts to database
 * 
 * Run with: npx tsx scripts/migrate-youtube-channels.ts
 */

import { db } from "../lib/db";
import { NOLLYWOOD_CHANNEL_IDS } from "../lib/youtube-channels";

async function migrateChannels() {
  try {
    console.log("Starting YouTube channels migration...");
    console.log(`Found ${NOLLYWOOD_CHANNEL_IDS.length} channel IDs in file`);

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const channelId of NOLLYWOOD_CHANNEL_IDS) {
      try {
        // Check if channel already exists
        // Note: Prisma converts YouTubeChannel model to youTubeChannel (camelCase with capital T)
        const existing = await db.youTubeChannel.findUnique({
          where: { channelId },
        });

        if (existing) {
          console.log(`  ✓ Channel ${channelId} already exists, skipping`);
          skipped++;
          continue;
        }

        // Add channel to database
        await db.youTubeChannel.create({
          data: {
            channelId,
            isActive: true,
            order: added, // Use added count as initial order
          },
        });

        console.log(`  ✓ Added channel ${channelId}`);
        added++;
      } catch (error) {
        console.error(`  ✗ Error adding channel ${channelId}:`, error);
        errors++;
      }
    }

    console.log("\nMigration complete!");
    console.log(`  Added: ${added}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

migrateChannels();

