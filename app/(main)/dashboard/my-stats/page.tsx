import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/lib/db";
import MyStatsContent from "@/components/dashboard/my-stats-content";

export default async function DashboardMyStatsPage() {
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

  return <MyStatsContent />;
}


