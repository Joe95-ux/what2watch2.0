/**
 * Database-backed YouTube channels configuration
 * This replaces the file-based approach in youtube-channels.ts
 */

import { db } from "./db";

/**
 * Get all active Nollywood YouTube channel IDs from database
 */
export async function getNollywoodChannelIds(): Promise<string[]> {
  try {
    const channels = await db.youTubeChannel.findMany({
      where: {
        isActive: true,
      },
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
 * Get all active Nollywood YouTube channels with full details from database
 */
export async function getNollywoodChannels() {
  try {
    const channels = await db.youTubeChannel.findMany({
      where: {
        isActive: true,
      },
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

