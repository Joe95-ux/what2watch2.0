import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
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

  // Look up user by username or ID to get the actual userId
  const targetUser = await db.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { id: identifier },
      ],
    },
    select: { id: true },
  });

  if (!targetUser) {
    redirect("/forum/users");
  }

  return <UserProfileContent userId={targetUser.id} />;
}

