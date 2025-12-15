"use client";

import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

interface SafeHtmlContentProps {
  content: string;
  className?: string;
}

/**
 * Safely renders HTML content from Tiptap editor
 * Sanitizes HTML to prevent XSS attacks
 */
export function SafeHtmlContent({ content, className }: SafeHtmlContentProps) {
  const sanitizedContent = useMemo(() => {
    if (!content) return "";
    
    // Sanitize HTML content
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "u", "s", "code", "pre",
        "h1", "h2", "h3", "ul", "ol", "li", "blockquote",
        "a", "img", "div", "span"
      ],
      ALLOWED_ATTR: [
        "href", "target", "rel", "src", "alt", "class", "style"
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }, [content]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}

