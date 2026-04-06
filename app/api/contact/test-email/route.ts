"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendContactSubmissionEmail } from "@/lib/contact-email";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        isForumAdmin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin =
      user.role === "ADMIN" ||
      user.role === "SUPER_ADMIN" ||
      user.isForumAdmin === true;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const type =
      body?.type === "support" || body?.type === "general"
        ? body.type
        : "feedback";

    const ok = await sendContactSubmissionEmail({
      type,
      reason: body?.reason || "SMTP test email",
      priority: body?.priority || "Medium",
      message:
        body?.message ||
        "This is a test contact email from the admin-only endpoint.",
      userEmail: user.email,
      username: user.username,
      displayName: user.displayName,
    });

    if (!ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SMTP send failed. Check SMTP_* and CONTACT_* env vars and Resend setup.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully.",
    });
  } catch (error) {
    console.error("[Contact test-email] POST error", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}

