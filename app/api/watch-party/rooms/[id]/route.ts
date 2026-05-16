import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getWatchPartyRoomSummaryForUser, isValidWatchPartyRoomId } from "@/lib/watch-party/room-summary-server";

async function requireUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }
  return { ok: true as const, user };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  if (!id?.trim() || !isValidWatchPartyRoomId(id)) {
    return NextResponse.json({ error: "Invalid party id" }, { status: 400 });
  }

  const summary = await getWatchPartyRoomSummaryForUser(id, authResult.user.id);
  if (!summary) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  return NextResponse.json(summary);
}
