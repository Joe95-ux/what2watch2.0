/**
 * Database-backed YouTube channels configuration
 * This replaces the file-based approach in youtube-channels.ts
 */

import { db } from "./db";

/**
 * Get all Nollywood YouTube channel IDs from database
 * Returns all channels (visibility controlled by isPrivate flag)
 */
export async function getNollywoodChannelIds(): Promise<string[]> {
  try {
    const channels = await db.youTubeChannel.findMany({
      orderBy: {
        order: "asc",
      },
      select: {
        channelId: true,
      },
    });

    return channels.map((channel) => channel.channelId);
  } catch (error) {
    console.error("Error fetching channel IDs from database:", error);
    // Fallback to empty array
    return [];
  }
}

/**
 * Get all Nollywood YouTube channels with full details from database
 * Returns all channels (visibility controlled by isPrivate flag)
 */
export async function getNollywoodChannels() {
  try {
    const channels = await db.youTubeChannel.findMany({
      orderBy: {
        order: "asc",
      },
    });

    return channels;
  } catch (error) {
    console.error("Error fetching channels from database:", error);
    return [];
  }
}

