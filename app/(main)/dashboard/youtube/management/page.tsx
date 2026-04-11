import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import YouTubeManagementContent from "@/components/youtube/youtube-management-content";

export const metadata: Metadata = {
  title: "YouTube channel management — privacy & visibility | what2watch",
  description:
    "Control how your linked YouTube channels appear on what2watch: visibility, privacy, and metadata—keep your presence aligned with how you want to be discovered.",
  robots: { index: false, follow: true },
};

export default async function YouTubeManagementPage() {
  const { userId } = await auth();

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

  return <YouTubeManagementContent />;
}

