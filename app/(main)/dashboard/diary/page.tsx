import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import DiaryContent from "@/components/dashboard/diary-content";

export default async function DiaryPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { preferences: true },
  });

  if (!user || !user.preferences?.onboardingCompleted) {
    redirect("/onboarding");
  }

  return <DiaryContent />;
}

