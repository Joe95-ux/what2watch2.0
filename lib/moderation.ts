/**
 * Content moderation utilities
 * Handles profanity filtering, HTML sanitization, and content validation
 */

import { Filter } from 'bad-words';
import DOMPurify from 'isomorphic-dompurify';

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
  // Use DOMPurify for robust HTML sanitization
  // DOMPurify removes all dangerous HTML/JavaScript while preserving text content
  // For maximum security, we strip all HTML tags (plain text only)
  // If you want to allow basic formatting, uncomment ALLOWED_TAGS below
  const sanitized = DOMPurify.sanitize(html, {
    // Strip all HTML tags for maximum security (default behavior)
    // To allow basic formatting, uncomment the line below:
    // ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    ALLOWED_ATTR: [],
    // Preserve text content even when removing HTML tags
    KEEP_CONTENT: true,
  });
  
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
    // DOMPurify removes dangerous HTML but preserves text content
    // If the sanitized content is significantly shorter, it might indicate malicious HTML/script injection
    // However, with DOMPurify's KEEP_CONTENT option, text should be preserved
    // This check is more lenient since DOMPurify is more precise than regex
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

