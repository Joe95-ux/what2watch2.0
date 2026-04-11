import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "from",
  "as",
  "so",
  "not",
  "no",
  "i",
  "we",
  "you",
  "they",
  "he",
  "she",
]);

function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keywords) {
    const n = k.trim().toLowerCase();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(k.trim());
  }
  return out;
}

function fallbackKeywordsFromNotes(notes: string): string[] {
  const cleaned = notes.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const words = cleaned
    .split(/[\s,;.]+/)
    .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ""))
    .filter(Boolean);
  const meaningful = words.filter(
    (w) => w.length > 2 && !STOP.has(w.toLowerCase())
  );
  if (meaningful.length > 0) {
    return dedupeKeywords([meaningful[0].toLowerCase()]);
  }
  if (words.length > 0) {
    return dedupeKeywords([words[0].toLowerCase()]);
  }
  return [];
}

/**
 * Assigns keyword tags per list item from curator notes (channel description in the list builder).
 * Uses OpenAI when configured; otherwise a small heuristic so at least one keyword exists when notes are non-empty.
 */
export async function assignKeywordsToChannelListItems(
  items: Array<{ channelId: string; notes: string | null }>
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  for (const item of items) {
    result.set(item.channelId, []);
  }

  const withNotes = items.filter((i) => i.notes?.trim());
  if (withNotes.length === 0) {
    return result;
  }

  if (!openai) {
    for (const item of withNotes) {
      const kw = fallbackKeywordsFromNotes(item.notes!);
      result.set(item.channelId, kw);
    }
    return result;
  }

  try {
    const payload = withNotes.map((item) => ({
      channelId: item.channelId,
      notes: item.notes!.slice(0, 800),
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'You extract concise keywords from short curator notes about YouTube channels. For each item, output 1 to 4 keywords (single words or short 2–3 word phrases). Use lowercase. No hashtags. Return JSON only: { "items": [ { "channelId": "string", "keywords": ["keyword1", "keyword2"] } ] }. Every item that has notes must have at least one keyword.',
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      items?: Array<{ channelId?: string; keywords?: unknown }>;
    };
    const rows = Array.isArray(parsed.items) ? parsed.items : [];

    for (const item of withNotes) {
      const row = rows.find((r) => r.channelId === item.channelId);
      let keywords: string[] = [];
      if (row && Array.isArray(row.keywords)) {
        keywords = row.keywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k) => k.trim().slice(0, 48).toLowerCase())
          .slice(0, 4);
      }
      keywords = dedupeKeywords(keywords);
      if (keywords.length === 0) {
        keywords = fallbackKeywordsFromNotes(item.notes!);
      }
      result.set(item.channelId, keywords);
    }
  } catch (e) {
    console.error("[assignKeywordsToChannelListItems] OpenAI error:", e);
    for (const item of withNotes) {
      result.set(item.channelId, fallbackKeywordsFromNotes(item.notes!));
    }
  }

  return result;
}
