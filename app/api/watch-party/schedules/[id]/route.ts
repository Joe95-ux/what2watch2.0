import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await db.watchPartySchedule.findFirst({
    where: { id },
    select: { id: true, hostUserId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  if (existing.hostUserId !== authResult.user.id) {
    return NextResponse.json({ error: "Only the host can delete this schedule" }, { status: 403 });
  }

  await db.watchPartySchedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
