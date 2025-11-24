/**
 * Backfill slugs for existing YouTubeChannel records.
 *
 * Run with: npx tsx scripts/backfill-channel-slugs.ts
 */
import "dotenv/config";

import { db } from "../lib/db";
import { generateUniqueChannelSlug } from "../lib/channel-slug";

async function backfillChannelSlugs() {
  console.log("Fetching YouTube channels...");

  const channels = await db.youTubeChannel.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      channelId: true,
      title: true,
      slug: true,
    },
  });

  console.log(`Found ${channels.length} channels`);

  const seenSlugs = new Set<string>();
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const channel of channels) {
    const trimmedSlug = channel.slug?.trim() || null;
    const hasSlug = Boolean(trimmedSlug);

    if (hasSlug && !seenSlugs.has(trimmedSlug!)) {
      seenSlugs.add(trimmedSlug!);
      skipped++;
      continue;
    }

    const reason = hasSlug ? "duplicate slug" : "missing slug";

    try {
      const baseInput =
        channel.title?.trim() ||
        channel.channelId ||
        `channel-${channel.id.slice(-6)}`;

      const newSlug = await generateUniqueChannelSlug(baseInput, channel.id);

      await db.youTubeChannel.update({
        where: { id: channel.id },
        data: { slug: newSlug },
      });

      seenSlugs.add(newSlug);
      updated++;

      console.log(`  ✓ ${channel.channelId}: set slug ${newSlug} (${reason})`);
    } catch (error) {
      errors++;
      console.error(`  ✗ ${channel.channelId}: failed to set slug (${reason})`, error);
    }
  }

  console.log("\nBackfill complete");
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (already unique): ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

backfillChannelSlugs()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });


