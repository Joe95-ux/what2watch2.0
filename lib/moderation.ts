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
export function sanitizeHtml(html: string): string {
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
  
  return sanitized.trim();
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

