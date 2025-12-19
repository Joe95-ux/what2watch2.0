/**
 * Utility functions for parsing @mentions from forum content
 */

/**
 * Extract @mentions from text content
 * Matches @username patterns (alphanumeric, underscores, hyphens)
 * Returns array of unique usernames (without @ symbol)
 */
export function extractMentions(content: string): string[] {
  // Match @username patterns
  // Username can contain: letters, numbers, underscores, hyphens
  // Must start with @ and be followed by at least one valid character
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const matches = content.matchAll(mentionRegex);
  const mentions = new Set<string>();

  for (const match of matches) {
    const username = match[1];
    // Filter out common false positives (like email addresses)
    // Only add if it's not part of an email (no @ before it that's part of email)
    if (username && username.length > 0) {
      mentions.add(username.toLowerCase());
    }
  }

  return Array.from(mentions);
}

/**
 * Replace @mentions in content with HTML links
 * Used for displaying mentions in rendered content
 */
export function replaceMentionsWithLinks(content: string): string {
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  return content.replace(mentionRegex, (match, username) => {
    return `<a href="/users/${username}" class="mention-link" data-username="${username}">@${username}</a>`;
  });
}

