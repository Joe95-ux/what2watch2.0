/**
 * Link validation utilities for forum content
 */

/**
 * Suspicious domain patterns (common phishing/spam domains)
 * In production, use a proper domain reputation service
 */
const SUSPICIOUS_DOMAINS = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  // Add more as needed
];

const ALLOWED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "imdb.com",
  "tmdb.org",
  "themoviedb.org",
  "letterboxd.com",
  "trakt.tv",
  "rottentomatoes.com",
  "metacritic.com",
  "github.com",
  "stackoverflow.com",
  "reddit.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "facebook.com",
  "linkedin.com",
  "medium.com",
  "wikipedia.org",
  "wikimedia.org",
];

/**
 * Validate a URL
 */
export interface LinkValidationResult {
  isValid: boolean;
  isSafe: boolean;
  reason?: string;
  domain?: string;
}

export async function validateLink(url: string): Promise<LinkValidationResult> {
  try {
    // Parse URL
    const urlObj = new URL(url);

    // Check protocol
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return {
        isValid: false,
        isSafe: false,
        reason: "Only HTTP and HTTPS links are allowed",
      };
    }

    const domain = urlObj.hostname.toLowerCase().replace("www.", "");

    // Check against allowed domains (whitelist approach for safety)
    const isAllowed = ALLOWED_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));

    // Check against suspicious domains
    const isSuspicious = SUSPICIOUS_DOMAINS.some((suspicious) => domain === suspicious || domain.endsWith(`.${suspicious}`));

    // For now, allow all domains but flag suspicious ones
    // In production, integrate with a URL reputation service like:
    // - Google Safe Browsing API
    // - VirusTotal API
    // - URLScan.io
    if (isSuspicious) {
      return {
        isValid: true,
        isSafe: false,
        reason: "This link uses a URL shortener or suspicious domain. Please use direct links when possible.",
        domain,
      };
    }

    // Check for common phishing patterns
    if (containsPhishingPatterns(url)) {
      return {
        isValid: true,
        isSafe: false,
        reason: "This link appears suspicious. Please verify it's safe before sharing.",
        domain,
      };
    }

    return {
      isValid: true,
      isSafe: true,
      domain,
    };
  } catch (error) {
    return {
      isValid: false,
      isSafe: false,
      reason: "Invalid URL format",
    };
  }
}

/**
 * Check for common phishing patterns
 */
function containsPhishingPatterns(url: string): boolean {
  const lowerUrl = url.toLowerCase();

  // Check for common phishing patterns
  const phishingPatterns = [
    /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/, // IP addresses (often used in phishing)
    /login[^/]*\.(tk|ml|ga|cf|gq)/, // Suspicious TLDs with login
    /verify[^/]*\.(tk|ml|ga|cf|gq)/, // Suspicious TLDs with verify
    /secure[^/]*\.(tk|ml|ga|cf|gq)/, // Suspicious TLDs with secure
  ];

  return phishingPatterns.some((pattern) => pattern.test(lowerUrl));
}

/**
 * Validate all links in content
 */
export async function validateLinksInContent(content: string): Promise<{
  allSafe: boolean;
  unsafeLinks: Array<{ url: string; reason: string }>;
}> {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const urls = content.match(urlRegex) || [];

  const unsafeLinks: Array<{ url: string; reason: string }> = [];

  for (const url of urls) {
    const validation = await validateLink(url);
    if (!validation.isSafe) {
      unsafeLinks.push({
        url,
        reason: validation.reason || "Link validation failed",
      });
    }
  }

  return {
    allSafe: unsafeLinks.length === 0,
    unsafeLinks,
  };
}

