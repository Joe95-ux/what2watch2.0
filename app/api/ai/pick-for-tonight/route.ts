import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { resolveMaxChatQuestions } from "@/lib/subscription";
import { PRO_PRICE_USD_MONTHLY } from "@/lib/billing";
import type { PickForTonightCandidate, PickForTonightPick } from "@/lib/pick-for-tonight-types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Media = "movie" | "tv";

function normMedia(m: string): Media {
  return m === "tv" ? "tv" : "movie";
}

function candidateId(tmdbId: number, mediaType: string): string {
  return `${normMedia(mediaType)}:${tmdbId}`;
}

function trimText(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return t;
}

function mergeHint(map: Map<string, PickForTonightCandidate>, c: PickForTonightCandidate, hint: string) {
  const prev = map.get(c.id);
  if (!prev) {
    map.set(c.id, { ...c, hints: [hint] });
    return;
  }
  if (!prev.hints.includes(hint)) prev.hints.push(hint);
}

export async function POST() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI is not configured" }, { status: 503 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, role: true, chatQuota: true, stripeSubscriptionStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          error: "BETA_ADMIN_ONLY",
          message: "Pick for tonight is currently in admin-only beta.",
        },
        { status: 403 }
      );
    }

    const totalQuestionCount = await db.aiChatEvent.count({
      where: { userId: user.id },
    });

    const maxQuestions = resolveMaxChatQuestions(user.chatQuota, user.stripeSubscriptionStatus);

    const [lists, playlists, favorites, chatSessions] = await Promise.all([
      db.list.findMany({
        where: { userId: user.id },
        select: {
          name: true,
          items: { select: { tmdbId: true, mediaType: true, title: true, note: true, posterPath: true } },
        },
      }),
      db.playlist.findMany({
        where: { userId: user.id },
        select: {
          name: true,
          items: { select: { tmdbId: true, mediaType: true, title: true, note: true, posterPath: true } },
        },
      }),
      db.favorite.findMany({
        where: { userId: user.id },
        select: { tmdbId: true, mediaType: true, title: true, posterPath: true },
      }),
      db.aiChatSession.findMany({
        where: { userId: user.id, mode: "movie-details" },
        orderBy: { updatedAt: "desc" },
        take: 18,
        select: { messages: true, metadata: true, updatedAt: true },
      }),
    ]);

    const byId = new Map<string, PickForTonightCandidate>();

    for (const list of lists) {
      for (const it of list.items) {
        const id = candidateId(it.tmdbId, it.mediaType);
        const base: PickForTonightCandidate = {
          id,
          tmdbId: it.tmdbId,
          mediaType: normMedia(it.mediaType),
          title: it.title,
          posterPath: it.posterPath ?? null,
          hints: [],
        };
        mergeHint(byId, base, `List “${trimText(list.name, 80)}”`);
        if (it.note && it.note.trim()) {
          mergeHint(byId, base, `List “${trimText(list.name, 60)}” — note: ${trimText(it.note, 220)}`);
        }
      }
    }

    for (const pl of playlists) {
      for (const it of pl.items) {
        const id = candidateId(it.tmdbId, it.mediaType);
        const base: PickForTonightCandidate = {
          id,
          tmdbId: it.tmdbId,
          mediaType: normMedia(it.mediaType),
          title: it.title,
          posterPath: it.posterPath ?? null,
          hints: [],
        };
        mergeHint(byId, base, `Playlist “${trimText(pl.name, 80)}”`);
        if (it.note && it.note.trim()) {
          mergeHint(byId, base, `Playlist “${trimText(pl.name, 60)}” — note: ${trimText(it.note, 220)}`);
        }
      }
    }

    for (const fav of favorites) {
      const id = candidateId(fav.tmdbId, fav.mediaType);
      const base: PickForTonightCandidate = {
        id,
        tmdbId: fav.tmdbId,
        mediaType: normMedia(fav.mediaType),
        title: fav.title,
        posterPath: fav.posterPath ?? null,
        hints: [],
      };
      if (!byId.has(id)) {
        mergeHint(byId, base, "Watchlist");
      } else {
        mergeHint(byId, base, "Also on your watchlist");
      }
    }

    let candidates = Array.from(byId.values());
    candidates.sort((a, b) => b.hints.length - a.hints.length || a.title.localeCompare(b.title));

    const chatLines: string[] = [];
    for (const session of chatSessions) {
      const meta = (session.metadata as { tmdbId?: number; mediaType?: string } | null) || {};
      const tmdbId = typeof meta.tmdbId === "number" ? meta.tmdbId : null;
      const mediaType = meta.mediaType ? normMedia(String(meta.mediaType)) : null;
      const titleHint =
        tmdbId != null && mediaType
          ? byId.get(candidateId(tmdbId, mediaType))?.title ?? `#${tmdbId}`
          : "a title you chatted about";

      const raw = session.messages;
      const messages = Array.isArray(raw) ? raw : [];
      const tail = messages.slice(-6);
      const parts: string[] = [];
      for (const m of tail) {
        if (!m || typeof m !== "object") continue;
        const role = "role" in m && typeof (m as { role?: string }).role === "string" ? (m as { role: string }).role : "";
        const content =
          "content" in m && typeof (m as { content?: string }).content === "string"
            ? (m as { content: string }).content
            : "";
        if (!content.trim()) continue;
        parts.push(`${role}: ${trimText(content, 320)}`);
      }
      if (parts.length === 0) continue;
      chatLines.push(`— ${titleHint} (${mediaType ?? "movie"})\n${parts.join("\n")}`);
      if (chatLines.length >= 10) break;
    }

    const chatDigest = chatLines.join("\n\n");

    if (candidates.length === 0) {
      return NextResponse.json({
        insufficientContext: true,
        message:
          "Add movies or TV to your watchlist, lists, or playlists first. “Pick for tonight” only chooses from titles already in your library.",
        questionCount: totalQuestionCount,
        maxQuestions,
        usedAi: false,
      });
    }

    const hasNoteOrListHint = candidates.some((c) =>
      c.hints.some(
        (h) =>
          h.includes("— note:") ||
          h.startsWith("List ") ||
          h.startsWith("Playlist ")
      )
    );
    const hasRichContext = chatDigest.length > 40 || hasNoteOrListHint;

    if (candidates.length === 1 && !hasRichContext) {
      const only = candidates[0];
      return NextResponse.json({
        picks: {
          primary: {
            ...only,
            reason:
              "This is the only title in your combined lists, playlists, and watchlist. Add a few more picks so we can compare options for tonight.",
            sources: only.hints.length ? only.hints : ["Your library"],
          },
          alternates: [] as PickForTonightPick[],
        },
        questionCount: totalQuestionCount,
        maxQuestions,
        usedAi: false,
      });
    }

    if (maxQuestions !== -1 && totalQuestionCount >= maxQuestions) {
      return NextResponse.json(
        {
          error: "QUESTION_LIMIT_REACHED",
          message: `You've reached your limit of ${maxQuestions} AI questions. Upgrade to Pro ($${PRO_PRICE_USD_MONTHLY}/mo) for more.`,
          questionCount: totalQuestionCount,
          maxQuestions,
        },
        { status: 403 }
      );
    }

    const MAX_CANDIDATES = 140;
    if (candidates.length > MAX_CANDIDATES) {
      candidates = candidates.slice(0, MAX_CANDIDATES);
    }

    const candidatePayload = candidates.map((c) => ({
      id: c.id,
      tmdbId: c.tmdbId,
      mediaType: c.mediaType,
      title: c.title,
      hints: c.hints.map((h) => trimText(h, 260)),
    }));

    const system = `You are “Pick for tonight” for What2Watch, a movie and TV app.
You must recommend exactly ONE primary title and UP TO TWO alternate titles for watching tonight.
Rules:
- You may ONLY choose titles from the provided JSON "candidates" array. Use each item's "id" field exactly (format "movie:123" or "tv:456").
- Never invent TMDB ids or titles that are not in "candidates".
- "reason" should be 2–4 sentences, warm and specific, tying the pick to list/playlist notes and/or the chat excerpts when relevant.
- "sources" is an array of short human-readable strings (e.g. "List: Sci-fi night", "Your note on Inception", "Recent chat about the ending"). If you only have the watchlist, say so honestly.
- If there are fewer than 3 total candidates, return fewer alternates (possibly zero).
Return strict JSON with keys: primary { id, reason, sources }, alternates [ { id, reason, sources }, ... ].`;

    const userBlock = JSON.stringify(
      {
        candidates: candidatePayload,
        perTitleChatExcerpts: chatDigest || "(no recent per-title chat in the sampled window)",
      },
      null,
      0
    );

    const t0 = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Here is the user's library context as JSON. Pick for tonight.\n\n${userBlock}`,
        },
      ],
      temperature: 0.65,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }

    let parsed: {
      primary?: { id?: string; reason?: string; sources?: string[] };
      alternates?: Array<{ id?: string; reason?: string; sources?: string[] }>;
    };
    try {
      parsed = JSON.parse(stripJsonFence(rawContent)) as typeof parsed;
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    const idSet = new Set(candidates.map((c) => c.id));

    function enrich(
      raw: { id?: string; reason?: string; sources?: string[] } | undefined
    ): PickForTonightPick | null {
      if (!raw?.id || !idSet.has(raw.id)) return null;
      const base = byId.get(raw.id);
      if (!base) return null;
      const sources = Array.isArray(raw.sources)
        ? raw.sources.filter((s): s is string => typeof s === "string").map((s) => trimText(s, 120))
        : [];
      return {
        ...base,
        reason: trimText(typeof raw.reason === "string" && raw.reason.trim() ? raw.reason : "A strong match from your library.", 720),
        sources: sources.length ? sources.slice(0, 8) : ["Your lists, playlists, and watchlist"],
      };
    }

    let primary = enrich(parsed.primary);
    const alternates: PickForTonightPick[] = [];
    for (const a of parsed.alternates ?? []) {
      const p = enrich(a);
      if (p && p.id !== primary?.id) alternates.push(p);
    }

    if (!primary) {
      primary = {
        ...candidates[0],
        reason: "We could not lock onto the model’s first choice, so here is a strong option from your library.",
        sources: candidates[0].hints.length ? candidates[0].hints.slice(0, 4) : ["Your library"],
      };
    }

    const dedupedAlternates = alternates.filter((a) => a.id !== primary.id).slice(0, 2);

    const responseTime = Date.now() - t0;

    try {
      await db.aiChatEvent.create({
        data: {
          userId: user.id,
          sessionId: "pick-for-tonight",
          userMessage: trimText("pick-for-tonight", 500),
          intent: "INFORMATION",
          aiResponse: trimText(JSON.stringify({ primaryId: primary.id, alternateIds: dedupedAlternates.map((x) => x.id) }), 8000),
          responseTime,
          model: "gpt-4o-mini",
          promptTokens: completion.usage?.prompt_tokens ?? null,
          completionTokens: completion.usage?.completion_tokens ?? null,
          totalTokens: completion.usage?.total_tokens ?? null,
          resultsCount: 1 + dedupedAlternates.length,
          resultIds: [primary.tmdbId, ...dedupedAlternates.map((x) => x.tmdbId)],
          resultTypes: [primary.mediaType, ...dedupedAlternates.map((x) => x.mediaType)],
        },
      });
    } catch (e) {
      console.error("pick-for-tonight: failed to log AiChatEvent", e);
    }

    return NextResponse.json({
      picks: { primary, alternates: dedupedAlternates },
      questionCount: totalQuestionCount + 1,
      maxQuestions,
      usedAi: true,
    });
  } catch (error) {
    console.error("pick-for-tonight error:", error);
    return NextResponse.json({ error: "Failed to generate pick" }, { status: 500 });
  }
}
