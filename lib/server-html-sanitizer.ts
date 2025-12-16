/**
 * Server-safe HTML sanitizer that works in serverless environments
 * Does not require jsdom or browser APIs
 */

/**
 * Sanitize HTML content, allowing only safe tags and attributes
 */
export function sanitizeHtml(
  html: string,
  options: {
    allowedTags?: string[];
    allowedAttributes?: string[];
    allowedUriRegex?: RegExp;
  } = {}
): string {
  const {
    allowedTags = [],
    allowedAttributes = ["href", "target", "rel", "src", "alt", "class"],
    allowedUriRegex = /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  } = options;

  if (!html) return "";

  // Remove script and style tags and their content
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");

  // If no allowed tags, strip all HTML
  if (allowedTags.length === 0) {
    return sanitized
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  // Build regex for allowed tags
  const allowedTagsRegex = new RegExp(
    `</?(?:${allowedTags.join("|")})(?:\\s[^>]*)?>`,
    "gi"
  );

  // Extract and sanitize tags
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  const allowedTagsSet = new Set(allowedTags.map((t) => t.toLowerCase()));

  sanitized = sanitized.replace(tagRegex, (match) => {
    // Check if it's a closing tag
    if (match.startsWith("</")) {
      const tagMatch = match.match(/<\/([a-z][a-z0-9]*)/i);
      if (tagMatch) {
        const lowerTag = tagMatch[1].toLowerCase();
        if (allowedTagsSet.has(lowerTag)) {
          return `</${lowerTag}>`;
        }
      }
      return "";
    }

    // Opening tag - extract tag name
    const tagMatch = match.match(/<([a-z][a-z0-9]*)/i);
    if (!tagMatch) return "";
    
    const lowerTag = tagMatch[1].toLowerCase();

    // Remove disallowed tags
    if (!allowedTagsSet.has(lowerTag)) {
      return "";
    }

    // Extract and sanitize attributes
    const attrRegex = /(\w+)\s*=\s*(["'])(.*?)\2/gi;
    const sanitizedAttrs: string[] = [];
    let matchResult;

    while ((matchResult = attrRegex.exec(match)) !== null) {
      const [, attrName, quote, attrValue] = matchResult;
      const lowerAttr = attrName.toLowerCase();

      // Only allow specific attributes
      if (!allowedAttributes.includes(lowerAttr)) {
        continue;
      }

      // Special handling for URLs (href, src)
      if (lowerAttr === "href" || lowerAttr === "src") {
        const trimmedValue = attrValue.trim();
        // Remove javascript: and data: URLs
        if (
          trimmedValue.toLowerCase().startsWith("javascript:") ||
          trimmedValue.toLowerCase().startsWith("data:")
        ) {
          continue;
        }

        // Validate URL format
        if (!allowedUriRegex.test(trimmedValue)) {
          continue;
        }

        // Escape quotes in URL
        const escapedValue = trimmedValue.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        sanitizedAttrs.push(`${lowerAttr}=${quote}${escapedValue}${quote}`);
      } else {
        // For other attributes, basic sanitization
        const escapedValue = attrValue
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        sanitizedAttrs.push(`${lowerAttr}=${quote}${escapedValue}${quote}`);
      }
    }

    // Return tag with sanitized attributes
    if (sanitizedAttrs.length > 0) {
      return `<${lowerTag} ${sanitizedAttrs.join(" ")}>`;
    }
    return `<${lowerTag}>`;
  });

  // Decode HTML entities for better readability
  sanitized = sanitized
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return sanitized.trim();
}

/**
 * Sanitize title (strip all HTML)
 */
export function sanitizeTitle(title: string): string {
  return sanitizeHtml(title, { allowedTags: [] });
}

/**
 * Sanitize content (allow safe HTML tags)
 */
export function sanitizeContent(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "code",
      "pre",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "div",
      "span",
    ],
    allowedAttributes: ["href", "target", "rel", "src", "alt", "class"],
    allowedUriRegex: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

