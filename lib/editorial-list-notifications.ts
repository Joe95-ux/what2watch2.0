import { db } from "@/lib/db";
import {
  getEditorialNotificationsAllowlistEmails,
  hasEditorialNotificationsAccess,
} from "@/lib/subscription";
import { triggerUserNotificationsChanged } from "@/lib/pusher/server";
import { publishUserNotification } from "@/lib/pusher/beams-server";

interface NotifyPaidUsersInput {
  listId: string;
  listName: string;
  actorUserId: string;
}

export async function notifyPaidUsersEditorialListPublished({
  listId,
  listName,
  actorUserId,
}: NotifyPaidUsersInput) {
  const allowlistEmails = getEditorialNotificationsAllowlistEmails();

  const candidates = await db.user.findMany({
    where: {
      id: { not: actorUserId },
      OR: [
        { stripeSubscriptionStatus: { in: ["active", "trialing"] } },
        ...(allowlistEmails.length > 0 ? [{ email: { in: allowlistEmails } }] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      stripeSubscriptionStatus: true,
      notifyOnEditorialLists: true,
    },
  });

  const recipientIds = candidates
    .filter(
      (user) =>
        user.notifyOnEditorialLists !== false &&
        hasEditorialNotificationsAccess(user.stripeSubscriptionStatus, user.email),
    )
    .map((user) => user.id);

  if (recipientIds.length === 0) return;

  const title = "New editorial list is out";
  const message = `"${listName}" is now live`;
  const linkUrl = `/lists/${listId}`;

  await db.generalNotification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      type: "EDITORIAL_LIST_PUBLISHED",
      title,
      message,
      linkUrl,
      metadata: { listId },
    })),
  });

  await triggerUserNotificationsChanged(recipientIds, "general", {
    source: "editorial-list-published",
    listId,
  });

  await publishUserNotification({
    userIds: recipientIds,
    title,
    body: message,
    linkUrl,
    data: { listId },
  });
}
