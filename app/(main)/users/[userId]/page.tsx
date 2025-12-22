import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { assertObjectId } from "@/lib/assert-objectId";
import UserProfileContent from "@/components/social/user-profile-content";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: clerkUserId } = await auth();
  const { userId: identifier } = await params;

  console.log("[Server /users/[userId]/page] Received params:", {
    identifier,
    type: typeof identifier,
    isNull: identifier === null,
    isUndefined: identifier === undefined,
    isEmpty: identifier === "",
    trimmed: identifier?.trim(),
  });

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const currentUser = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    include: { preferences: true },
  });

  if (!currentUser || !currentUser.preferences?.onboardingCompleted) {
    redirect("/onboarding");
  }

  if (!identifier?.trim()) redirect("/forum/users");

  // look up by username first
  console.log("[Server /users/[userId]/page] Attempting username lookup:", identifier);
  let targetUser = await db.user.findFirst({
    where: { username: identifier },
    select: { id: true },
  });

  console.log("[Server /users/[userId]/page] Username lookup result:", targetUser ? { id: targetUser.id } : "not found");

  // if not found, look up by ObjectId
  if (!targetUser) {
    const validObjectId = assertObjectId(identifier);
    console.log("[Server /users/[userId]/page] Valid ObjectId?", validObjectId);
    if (validObjectId) {
      console.log("[Server /users/[userId]/page] Attempting ObjectId lookup:", validObjectId);
      targetUser = await db.user.findUnique({
        where: { id: validObjectId },
        select: { id: true },
      });
      console.log("[Server /users/[userId]/page] ObjectId lookup result:", targetUser ? { id: targetUser.id } : "not found");
    }
  }

  if (!targetUser) redirect("/forum/users");

  console.log("[Server /users/[userId]/page] Passing userId to UserProfileContent:", targetUser.id);
  return <UserProfileContent userId={targetUser.id} />;
}
