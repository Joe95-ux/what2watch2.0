/**
 * Utility functions to extract links from forum post content
 */

export interface ExtractedLink {
  url: string;
  text: string;
  domain?: string;
}

/**
 * Extract all links from HTML content
 */
export function extractLinksFromHtml(html: string): ExtractedLink[] {
  if (!html) return [];

  const links: ExtractedLink[] = [];
  
  // Match <a> tags with href attributes
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;
  
  while ((match = anchorRegex.exec(html)) !== null) {
    const url = match[1];
    const text = match[2].replace(/<[^>]*>/g, "").trim() || url; // Strip HTML tags from link text
    
    if (url && isValidUrl(url)) {
      links.push({
        url,
        text,
        domain: getDomainFromUrl(url),
      });
    }
  }

  // Also match plain URLs in text (not already in <a> tags)
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const textContent = html.replace(/<[^>]*>/g, " "); // Remove HTML tags for plain text search
  
  let urlMatch;
  while ((urlMatch = urlRegex.exec(textContent)) !== null) {
    const url = urlMatch[1];
    // Check if this URL is already captured in an <a> tag
    if (!links.some(link => link.url === url)) {
      if (isValidUrl(url)) {
        links.push({
          url,
          text: url,
          domain: getDomainFromUrl(url),
        });
      }
    }
  }

  return links;
}

/**
 * Extract links from plain text content
 */
export function extractLinksFromText(text: string): ExtractedLink[] {
  if (!text) return [];

  const links: ExtractedLink[] = [];
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1];
    if (isValidUrl(url)) {
      links.push({
        url,
        text: url,
        domain: getDomainFromUrl(url),
      });
    }
  }

  return links;
}

/**
 * Extract all unique links from post content and metadata
 */
export function extractAllLinks(
  content: string,
  metadata?: Record<string, any> | null
): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const seenUrls = new Set<string>();

  // Extract from HTML content
  const contentLinks = extractLinksFromHtml(content);
  contentLinks.forEach(link => {
    if (!seenUrls.has(link.url)) {
      links.push(link);
      seenUrls.add(link.url);
    }
  });

  // Extract from metadata fields
  if (metadata) {
    const metadataFields = ["playlistLink", "listLink", "watchlistLink"];
    metadataFields.forEach(field => {
      const value = metadata[field];
      if (value && typeof value === "string" && isValidUrl(value)) {
        if (!seenUrls.has(value)) {
          links.push({
            url: value,
            text: value,
            domain: getDomainFromUrl(value),
          });
          seenUrls.add(value);
        }
      }
    });
  }

  return links;
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return "";
  }
}

