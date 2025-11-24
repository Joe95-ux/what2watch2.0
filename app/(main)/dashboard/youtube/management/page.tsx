import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import YouTubeManagementContent from "@/components/youtube/youtube-management-content";

export const metadata = {
  title: "YouTube Channel Management | what2watch",
  description: "Manage your YouTube channels, control visibility, and set privacy settings.",
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

