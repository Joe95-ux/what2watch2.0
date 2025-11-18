import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { z } from "zod";

import { db } from "@/lib/db";
import { Prisma, ListEngagementType } from "@prisma/client";

const VISITOR_COOKIE_NAME = "w2w_vid";
const VISITOR_COOKIE_MAX_AGE_DAYS = 365;
const VISIT_DEDUP_WINDOW_MINUTES = 180;

const eventSchema = z.object({
  listId: z.string().min(1, "listId is required"),
  type: z.enum([
    ListEngagementType.SHARE,
    ListEngagementType.VISIT,
  ]),
  source: z.string().trim().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = eventSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { listId, type, source, metadata } = result.data;
    const { userId: clerkUserId } = await auth();

    const list = await db.list.findUnique({
      where: { id: listId },
      select: { id: true, userId: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const actor = clerkUserId
      ? await db.user.findUnique({
          where: { clerkId: clerkUserId },
          select: { id: true },
        })
      : null;

    const cookieStoreResult = cookies();
    const cookieStore =
      cookieStoreResult instanceof Promise
        ? await cookieStoreResult
        : cookieStoreResult;

    let visitorToken = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
    let shouldSetCookie = false;

    if (!visitorToken) {
      visitorToken = randomUUID();
      shouldSetCookie = true;
    }

    if (type === ListEngagementType.VISIT && visitorToken) {
      const dedupeWindowStart = new Date(
        Date.now() - VISIT_DEDUP_WINDOW_MINUTES * 60 * 1000
      );

      const recentVisit = await db.listEngagementEvent.findFirst({
        where: {
          listId: list.id,
          type: ListEngagementType.VISIT,
          visitorToken,
          createdAt: { gte: dedupeWindowStart },
        },
      });

      if (recentVisit) {
        const response = NextResponse.json({ success: true, deduped: true });
        if (shouldSetCookie && visitorToken) {
          response.cookies.set({
            name: VISITOR_COOKIE_NAME,
            value: visitorToken,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: VISITOR_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
          });
        }
        return response;
      }
    }

    const metadataValue: Prisma.InputJsonValue | null = metadata
      ? (metadata as Prisma.InputJsonValue)
      : null;

    await db.listEngagementEvent.create({
      data: {
        listId: list.id,
        ownerId: list.userId,
        actorId: actor?.id ?? null,
        type,
        source: source ?? null,
        visitorToken,
        metadata: metadataValue,
      },
    });

    // Log for debugging (can be removed in production)
    if (type === ListEngagementType.SHARE) {
      console.log(`Share event recorded: listId=${list.id}, ownerId=${list.userId}, source=${source || 'unknown'}`);
    } else if (type === ListEngagementType.VISIT) {
      console.log(`Visit event recorded: listId=${list.id}, ownerId=${list.userId}, source=${source || 'unknown'}`);
    }

    const response = NextResponse.json({ success: true });
    if (shouldSetCookie && visitorToken) {
      response.cookies.set({
        name: VISITOR_COOKIE_NAME,
        value: visitorToken,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: VISITOR_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error("List event log error:", error);
    return NextResponse.json(
      { error: "Failed to log list analytics event" },
      { status: 500 }
    );
  }
}

