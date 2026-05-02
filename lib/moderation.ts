/**
 * Content moderation utilities
 * Handles profanity filtering, HTML sanitization, and content validation
 */

import { Filter } from 'bad-words';

// Initialize profanity filter with comprehensive word list
// bad-words library includes extensive profanity, racial slurs, and hate speech
const profanityFilter = new Filter({
  placeHolder: '*',
  list: [
    // Additional custom words can be added here if needed
    // The library already includes a comprehensive list
  ],
});

// Additional custom words to block (beyond bad-words default list)
// Add any specific terms you want to filter
const customBlockedWords: string[] = [
  // Add custom blocked words here if needed
];

// Add custom words to the filter
if (customBlockedWords.length > 0) {
  profanityFilter.addWords(...customBlockedWords);
}

// Check if content contains profanity
export function containsProfanity(text: string): boolean {
  // Use bad-words library for comprehensive profanity detection
  // It handles variations, misspellings, and obfuscated words
  return profanityFilter.isProfane(text);
}

// Sanitize HTML content to prevent XSS attacks
export function sanitizeHtml(html: string, options?: { trim?: boolean }): string {
  // Strip all HTML tags and decode HTML entities for maximum security
  // This approach works in serverless environments without requiring jsdom
  const sanitized = html
    // Remove script and style tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    // Decode numeric entities (basic support)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([a-f\d]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  const trim = options?.trim !== false;
  return trim ? sanitized.trim() : sanitized;
}

// Validate content length
export function validateContentLength(content: string, minLength: number = 1, maxLength: number = 5000): {
  valid: boolean;
  error?: string;
} {
  const length = content.trim().length;
  
  if (length < minLength) {
    return {
      valid: false,
      error: `Comment must be at least ${minLength} character${minLength !== 1 ? 's' : ''} long`,
    };
  }
  
  if (length > maxLength) {
    return {
      valid: false,
      error: `Comment must be no more than ${maxLength} characters long`,
    };
  }
  
  return { valid: true };
}

// Main moderation function
export interface ModerationResult {
  allowed: boolean;
  sanitized?: string;
  error?: string;
  reason?: 'profanity' | 'length' | 'sanitization';
}

export function moderateContent(content: string, options: {
  minLength?: number;
  maxLength?: number;
  allowProfanity?: boolean;
  sanitizeHtml?: boolean;
} = {}): ModerationResult {
  const {
    minLength = 1,
    maxLength = 5000,
    allowProfanity = false,
    sanitizeHtml: shouldSanitize = true,
  } = options;

  // Validate length
  const lengthCheck = validateContentLength(content, minLength, maxLength);
  if (!lengthCheck.valid) {
    return {
      allowed: false,
      error: lengthCheck.error,
      reason: 'length',
    };
  }

  // Check for profanity
  if (!allowProfanity && containsProfanity(content)) {
    return {
      allowed: false,
      error: 'Your comment contains inappropriate language. Please revise your comment.',
      reason: 'profanity',
    };
  }

  // Sanitize HTML
  let sanitized = content;
  if (shouldSanitize) {
    sanitized = sanitizeHtml(content);
    // The sanitizeHtml function removes dangerous HTML but preserves text content
    // If the sanitized content is significantly shorter, it might indicate malicious HTML/script injection
    // This check helps detect potential XSS attempts
    const originalTextLength = content.replace(/<[^>]*>/g, '').length; // Text without HTML
    const sanitizedTextLength = sanitized.replace(/<[^>]*>/g, '').length; // Text after sanitization
    
    // If more than 30% of text content was removed (likely malicious HTML/scripts), reject
    if (originalTextLength > 50 && sanitizedTextLength < originalTextLength * 0.7) {
      return {
        allowed: false,
        error: 'Your comment contains potentially harmful content. Please revise your comment.',
        reason: 'sanitization',
      };
    }
  }

  return {
    allowed: true,
    sanitized: sanitized.trim(),
  };
}

const WATCHING_THOUGHT_MIN = 8;
const WATCHING_THOUGHT_MAX = 1000;

/** Readable phrase/sentence: blocks emoji-only, number spam, keyboard-mash style text */
export function evaluatePhraseQuality(text: string): { ok: true } | { ok: false; error: string } {
  const s = text.trim();
  if (s.length < WATCHING_THOUGHT_MIN) {
    return {
      ok: false,
      error: `Please write at least ${WATCHING_THOUGHT_MIN} characters (a short phrase or sentence).`,
    };
  }

  const words = s.split(/\s+/).filter(Boolean);
  const letterChunks: string[] = s.match(/[a-zA-Z]+/g) ?? [];
  const allLetters = letterChunks.join("");
  if (allLetters.length < 4) {
    return {
      ok: false,
      error: "Please include readable words (letters), not only emoji, numbers, or symbols.",
    };
  }

  if (s.length >= 24 && words.length < 2) {
    return { ok: false, error: "Please use at least two words for longer messages." };
  }
  if (s.length >= 48 && words.length < 3) {
    return { ok: false, error: "Please write a short sentence with several words." };
  }

  const vowels = (allLetters.match(/[aeiouyAEIOUY]/g) ?? []).length;
  const vowelRatio = allLetters.length > 0 ? vowels / allLetters.length : 0;
  if (allLetters.length >= 16 && vowelRatio < 0.08) {
    return {
      ok: false,
      error: "That does not look like readable text. Please use normal words.",
    };
  }
  if (allLetters.length >= 6 && vowels < 1) {
    return { ok: false, error: "Please use readable words (include vowels), not random letters." };
  }

  const hasSubstantiveWord = letterChunks.some((w: string) => w.length >= 3 && /[aeiouyAEIOUY]/.test(w));
  if (!hasSubstantiveWord) {
    return { ok: false, error: "Please write a real word or short phrase, not random characters." };
  }

  const digitCount = (s.match(/\d/g) ?? []).length;
  if (s.length > 0 && digitCount / s.length > 0.45) {
    return { ok: false, error: "Too many numbers — please write a normal sentence." };
  }

  let maxLetterRun = 1;
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    const cur = s[i];
    const prev = s[i - 1];
    if (/[a-zA-Z]/.test(cur) && cur.toLowerCase() === prev.toLowerCase()) {
      run += 1;
      maxLetterRun = Math.max(maxLetterRun, run);
    } else {
      run = 1;
    }
  }
  if (maxLetterRun > 8) {
    return { ok: false, error: "Please avoid repeated character spam." };
  }

  return { ok: true };
}

/**
 * Watching thoughts / title discussion compose: sanitize HTML, length, profanity, phrase quality.
 * Use on client (validation message) and server (authoritative).
 */
export function moderateWatchingThoughtContent(raw: string): ModerationResult {
  const sanitized = sanitizeHtml(raw.trim());
  const lengthCheck = validateContentLength(sanitized, WATCHING_THOUGHT_MIN, WATCHING_THOUGHT_MAX);
  if (!lengthCheck.valid) {
    return {
      allowed: false,
      error: lengthCheck.error,
      reason: "length",
    };
  }

  if (containsProfanity(sanitized)) {
    return {
      allowed: false,
      error: "Your comment contains inappropriate language. Please revise your comment.",
      reason: "profanity",
    };
  }

  const quality = evaluatePhraseQuality(sanitized);
  if (quality.ok === false) {
    return {
      allowed: false,
      error: quality.error,
      reason: "length",
    };
  }

  return {
    allowed: true,
    sanitized: sanitized.trim(),
  };
}

/** Returns `null` if valid, otherwise an error string for toasts / inline messages */
export function getWatchingThoughtValidationError(raw: string): string | null {
  const r = moderateWatchingThoughtContent(raw);
  return r.allowed ? null : r.error || "Content does not meet guidelines.";
}

/** Replies: shorter OK; still profanity-filtered and HTML-stripped */
export function getWatchingReplyValidationError(raw: string): string | null {
  const moderation = moderateContent(raw.trim(), {
    minLength: 2,
    maxLength: 1000,
    allowProfanity: false,
    sanitizeHtml: true,
  });
  return moderation.allowed ? null : moderation.error || "Content does not meet guidelines.";
}

