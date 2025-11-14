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
  const { userId } = await params;

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

  return <UserProfileContent userId={userId} />;
}

