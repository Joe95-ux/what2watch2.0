import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export type PublicLinksResponse = {
  user: { displayName: string | null; username: string | null; avatarUrl: string | null; bio?: string | null };
  theme?: Record<string, unknown> | null;
  links: Array<{ id: string; label: string; url: string; icon?: string | null }>;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<NextResponse<PublicLinksResponse | { error: string }>> {
  try {
    const { username } = await params;
    if (!username?.trim()) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username: username.trim() },
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        linkPage: { select: { bio: true, theme: true } },
        userLinks: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: { id: true, label: true, url: true, icon: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const linkPage = user.linkPage;
    return NextResponse.json({
      user: {
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: linkPage?.bio ?? null,
      },
      theme: (linkPage?.theme as Record<string, unknown>) ?? null,
      links: user.userLinks.map((l) => ({
        id: l.id,
        label: l.label,
        url: l.url,
        icon: l.icon,
      })),
    });
  } catch (error) {
    console.error("Public links API error:", error);
    return NextResponse.json(
      { error: "Failed to load links" },
      { status: 500 }
    );
  }
}
