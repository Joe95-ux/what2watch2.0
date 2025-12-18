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
  let targetUser = await db.user.findFirst({
    where: { username: identifier },
    select: { id: true },
  });

  // if not found, look up by ObjectId
  if (!targetUser) {
    const validObjectId = assertObjectId(identifier);
    if (validObjectId) {
      targetUser = await db.user.findUnique({
        where: { id: validObjectId },
        select: { id: true },
      });
    }
  }


  if (!targetUser) redirect("/forum/users");

  return <UserProfileContent userId={targetUser.id} />;
}
