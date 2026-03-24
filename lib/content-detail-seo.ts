/** Truncate overview text for meta description (search engines ~150–160 chars). */
export function truncateMetaDescription(text: string | null | undefined, maxLen = 158): string {
  if (!text?.trim()) return "";
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}
