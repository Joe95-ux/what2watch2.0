import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { sendEmail, getEmailTemplate } from "@/lib/email";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET - Get user details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await requireAdmin();
    const { userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        isForumAdmin: true,
        isForumModerator: true,
        isBanned: true,
        bannedAt: true,
        bannedUntil: true,
        banReason: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedUntil: true,
        suspendReason: true,
        emailNotifications: true,
        pushNotifications: true,
        createdAt: true,
        _count: {
          select: {
            forumPosts: true,
            forumReplies: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH - Update user role or ban status
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const moderator = await requireAdmin();
    const { userId } = await params;
    const body = await request.json();
    const { 
      role, 
      isForumAdmin, 
      isForumModerator, 
      isBanned, 
      bannedUntil, 
      banReason,
      isSuspended,
      suspendedUntil,
      suspendReason
    } = body;

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        email: true,
        username: true,
        displayName: true,
        emailNotifications: true,
        pushNotifications: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (role !== undefined) {
      updateData.role = role;
    }

    if (isForumAdmin !== undefined) {
      updateData.isForumAdmin = isForumAdmin;
    }

    if (isForumModerator !== undefined) {
      updateData.isForumModerator = isForumModerator;
    }

    if (isBanned !== undefined) {
      updateData.isBanned = isBanned;
      if (isBanned) {
        updateData.bannedAt = new Date();
        updateData.banReason = banReason || null;
        if (bannedUntil) {
          updateData.bannedUntil = new Date(bannedUntil);
        } else {
          updateData.bannedUntil = null;
        }
        // Clear suspend when banning
        updateData.isSuspended = false;
        updateData.suspendedAt = null;
        updateData.suspendedUntil = null;
        updateData.suspendReason = null;
      } else {
        updateData.bannedAt = null;
        updateData.bannedUntil = null;
        updateData.banReason = null;
      }
    }

    if (isSuspended !== undefined) {
      updateData.isSuspended = isSuspended;
      if (isSuspended) {
        updateData.suspendedAt = new Date();
        updateData.suspendReason = suspendReason || null;
        if (suspendedUntil) {
          updateData.suspendedUntil = new Date(suspendedUntil);
        } else {
          updateData.suspendedUntil = null;
        }
      } else {
        updateData.suspendedAt = null;
        updateData.suspendedUntil = null;
        updateData.suspendReason = null;
      }
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isForumAdmin: true,
        isForumModerator: true,
        isBanned: true,
        bannedAt: true,
        bannedUntil: true,
        banReason: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedUntil: true,
        suspendReason: true,
      },
    });

    // Determine action type for logging
    let actionType = "UPDATE_USER";
    let actionReason = null;
    if (isBanned !== undefined) {
      actionType = isBanned ? "BAN_USER" : "UNBAN_USER";
      actionReason = banReason || null;
    } else if (isSuspended !== undefined) {
      actionType = isSuspended ? "SUSPEND_USER" : "UNSUSPEND_USER";
      actionReason = suspendReason || null;
    }

    // Log moderation action
    await db.forumModerationAction.create({
      data: {
        moderatorId: moderator.id,
        actionType,
        targetType: "USER",
        targetId: userId,
        reason: actionReason,
        notes: JSON.stringify(updateData),
      },
    });

    // Send notifications if ban or suspend action
    if (isBanned !== undefined || isSuspended !== undefined) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const appealUrl = `${baseUrl}/dashboard/reports`;
      const actionType = isBanned ? "banned" : isSuspended ? "suspended" : null;
      const reason = isBanned ? banReason : suspendReason;
      const until = isBanned ? bannedUntil : suspendedUntil;
      const isAction = isBanned ? isBanned : isSuspended;

      if (isAction && actionType) {
        // Create general notification (not forum-specific)
        try {
          await db.generalNotification.create({
            data: {
              userId: targetUser.id,
              type: actionType === "banned" ? "ACCOUNT_BANNED" : "ACCOUNT_SUSPENDED",
              title: `Account ${actionType === "banned" ? "Banned" : "Suspended"}`,
              message: reason || `Your account has been ${actionType}. ${until ? `This action will be in effect until ${new Date(until).toLocaleDateString()}.` : ""}`,
              linkUrl: appealUrl,
              metadata: {
                actionType,
                reason,
                until: until || null,
                moderatorId: moderator.id,
              },
              isRead: false,
            },
          });
        } catch (notifError) {
          console.error("Failed to create notification:", notifError);
        }

        // Send email notification
        if (targetUser.emailNotifications && targetUser.email) {
          try {
            const emailContent = `
              <p>Your account has been <strong>${actionType}</strong> from the forum.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              ${until ? `<p><strong>Duration:</strong> Until ${new Date(until).toLocaleDateString()}</p>` : ""}
              <p>During this time, you ${actionType === "banned" ? "cannot access the forum" : "cannot create new posts or take certain actions"}.</p>
              <p>If you believe this action was taken in error, you can appeal through your dashboard.</p>
            `;

            await sendEmail({
              to: targetUser.email,
              subject: `Account ${actionType === "banned" ? "Banned" : "Suspended"} - What2Watch Forum`,
              html: getEmailTemplate({
                title: `Account ${actionType === "banned" ? "Banned" : "Suspended"}`,
                content: emailContent,
                ctaText: "View & Appeal",
                ctaUrl: appealUrl,
                footerText: "This is an automated message regarding your account status.",
              }),
            });
          } catch (emailError) {
            console.error("Failed to send email notification:", emailError);
          }
        }

      }
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

