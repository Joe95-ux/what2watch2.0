import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/links/click?linkId=xxx
 * Increments the link's click count and redirects to the link URL.
 * Used so outbound link clicks from the public link page are counted.
 */
export async function GET(request: NextRequest) {
  try {
    const linkId = request.nextUrl.searchParams.get("linkId");
    if (!linkId?.trim()) {
      return NextResponse.redirect(new URL("/", request.url), 302);
    }

    const link = await db.userLink.findUnique({
      where: { id: linkId.trim() },
      select: { id: true, url: true },
    });

    if (!link?.url) {
      return NextResponse.redirect(new URL("/", request.url), 302);
    }

    await db.userLink.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    });

    return NextResponse.redirect(link.url, 302);
  } catch {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }
}
