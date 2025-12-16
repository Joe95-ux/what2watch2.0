"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

interface SafeHtmlContentProps {
  content: string;
  className?: string;
}

/**
 * Safely renders HTML content from Tiptap editor
 * Sanitizes HTML to prevent XSS attacks
 * Content is already sanitized on the server, but we do client-side sanitization as well
 * This component only runs in the browser (client-side)
 */
export function SafeHtmlContent({ content, className }: SafeHtmlContentProps) {
  const sanitizedContent = useMemo(() => {
    if (!content) return "";
    
    // Content is already sanitized on the server before storage
    // Client-side sanitization is an additional safety layer
    // DOMPurify only works in browser, which is fine since this is a client component
    
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

