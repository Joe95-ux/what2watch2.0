import { db } from "@/lib/db";
import { hasEditorialNotificationsAccess } from "@/lib/subscription";
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
  const paidUsers = await db.user.findMany({
    where: {
      id: { not: actorUserId },
      notifyOnEditorialLists: true,
    },
    select: {
      id: true,
      email: true,
      stripeSubscriptionStatus: true,
    },
  });

  const recipientIds = paidUsers
    .filter((user) =>
      hasEditorialNotificationsAccess(user.stripeSubscriptionStatus, user.email)
    )
    .map((user) => user.id);

  if (recipientIds.length === 0) return;

  const title = "New editorial list is out";
  const message = `"${listName}" is now live for Pro members`;
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
