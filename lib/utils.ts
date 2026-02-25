import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Decode HTML entities in a string
 * Converts entities like &#39; to ' and &amp; to &
 * Works on both server and client
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([a-f\d]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
