import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { dashboardLandingHref, normalizeDashboardLayout } from "@/lib/dashboard-layout";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ home?: string }>;
}) {
  const { userId } = await auth();
  const params = await searchParams;

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user has completed onboarding
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { preferences: true },
  });

  if (!user) {
    redirect("/onboarding");
  }

  if (!user.preferences?.onboardingCompleted) {
    redirect("/onboarding");
  }

  if (params.home !== "1") {
    const landing = normalizeDashboardLayout(user.preferences.dashboardLayout).landing;
    const href = dashboardLandingHref(landing);
    if (href !== "/dashboard") {
      redirect(href);
    }
  }

  return <DashboardContent />;
}

