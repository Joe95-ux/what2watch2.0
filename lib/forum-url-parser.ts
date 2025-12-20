/**
 * Utility functions to extract IDs from forum post URLs
 */

export interface ParsedResource {
  type: "playlist" | "list";
  id: string;
}

/**
 * Extract playlist ID from URL or direct ID
 * Supports:
 * - /playlists/[id]
 * - /playlists/[id]/public
 * - Direct ObjectId
 */
export function extractPlaylistId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== "string") {
    return null;
  }

  // If it's already a valid ObjectId (24 hex characters), return it
  if (/^[0-9a-fA-F]{24}$/.test(urlOrId.trim())) {
    return urlOrId.trim();
  }

  // Try to extract from URL patterns
  const patterns = [
    /\/playlists\/([0-9a-fA-F]{24})(?:\/|$|\?|#)/, // /playlists/[id] or /playlists/[id]/public
    /playlist[Ii]d[=:]([0-9a-fA-F]{24})/, // playlistId=... or playlistId:...
  ];

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract list ID from URL or direct ID
 * Supports:
 * - /lists/[id]
 * - Direct ObjectId
 */
export function extractListId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== "string") {
    return null;
  }

  // If it's already a valid ObjectId (24 hex characters), return it
  if (/^[0-9a-fA-F]{24}$/.test(urlOrId.trim())) {
    return urlOrId.trim();
  }

  // Try to extract from URL patterns
  const patterns = [
    /\/lists\/([0-9a-fA-F]{24})(?:\/|$|\?|#)/, // /lists/[id]
    /list[Ii]d[=:]([0-9a-fA-F]{24})/, // listId=... or listId:...
  ];

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Parse a URL to determine if it's a playlist or list and extract the ID
 */
export function parseResourceUrl(urlOrId: string): ParsedResource | null {
  const playlistId = extractPlaylistId(urlOrId);
  if (playlistId) {
    return { type: "playlist", id: playlistId };
  }

  const listId = extractListId(urlOrId);
  if (listId) {
    return { type: "list", id: listId };
  }

  return null;
}

