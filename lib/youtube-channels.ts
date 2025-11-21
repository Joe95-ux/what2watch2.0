/**
 * Configuration for YouTube channels to display
 * 
 * To find a channel ID, you can:
 * 
 * Method 1: Using the search API endpoint (Recommended)
 * GET /api/youtube/channels/search?q=Nollywood Movies
 * This will return channel IDs that you can add to the array below
 * 
 * Method 2: Manual extraction
 * 1. Go to the YouTube channel page
 * 2. View page source (Ctrl+U or Cmd+U)
 * 3. Search for "channelId" or "externalId"
 * 4. Copy the ID (starts with "UC")
 * 
 * Method 3: From channel URL
 * - https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   Extract the part after /channel/
 * 
 * Popular Nollywood channels to consider:
 * - Nollywood Movies
 * - Nollywood Central
 * - Nollywood Classics
 * - Ibakatv
 * - GoldMyne TV
 * - Sandra Okunzuwa TV
 */

export const NOLLYWOOD_CHANNEL_IDS = [
  // Add your Nollywood YouTube channel IDs here
  // Example: "UCxxxxxxxxxxxxxxxxxxxxxxxxxx"
  // 
  // To get channel IDs, you can:
  // 1. Use the search endpoint: GET /api/youtube/channels/search?q=ChannelName
  // 2. Or manually extract from YouTube channel pages
  //
  // For now, leave empty and the component will gracefully handle it
  "UCHtfUf-9779RPujVXixJ7Tw", "UCneM4DHHUWMVwmYktz8X46g","UCHY9J0IWIWht6GqIBiLidBA","UCVgfrcFUczRB2TfaD5rYhHQ","UCx67PyaVTdkNTt2n6p-WIbw",
  "UCgvYAzU9Xp5N2jEITv0ZRPQ",
  "UCnZ28GESUBXyZSIvzcs1RXA",
  "UC4dptB_sE0skfVAWm1_HE_A",
  "UCI3ICwjVjEfBwApSyArpG0Q",
  "UC2BeWZ6kQoNMinwMzlzVTiQ",
  "UCG6orNVuXIICv9_ifH6msIA",
];

/**
 * Helper function to get channel ID from YouTube channel URL
 * Supports formats:
 * - https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxxxxxx
 * - https://www.youtube.com/@channelname
 * - https://youtube.com/c/channelname
 */
export function extractChannelIdFromUrl(url: string): string | null {
  // Extract from /channel/UC... format (most common)
  const channelMatch = url.match(/\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelMatch) {
    return channelMatch[1];
  }

  // Extract from /user/... format (older format)
  const userMatch = url.match(/\/user\/([a-zA-Z0-9_-]+)/);
  if (userMatch) {
    // User URLs need to be resolved via API, but we can return null to trigger search
    return null;
  }

  // Extract from /c/... format (custom URL)
  const customMatch = url.match(/\/c\/([a-zA-Z0-9_-]+)/);
  if (customMatch) {
    // Custom URLs need to be resolved via API
    return null;
  }

  // Extract from /@... format (handle format)
  const handleMatch = url.match(/\/@([a-zA-Z0-9_-]+)/);
  if (handleMatch) {
    // Handle URLs need to be resolved via API
    return null;
  }

  // If it looks like a direct channel ID (starts with UC and is 24 chars)
  const directIdMatch = url.match(/^([UC][a-zA-Z0-9_-]{23})$/);
  if (directIdMatch) {
    return directIdMatch[1];
  }

  // For custom URLs, we'd need to use the API to resolve them
  return null;
}

