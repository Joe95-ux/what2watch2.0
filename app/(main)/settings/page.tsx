import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import SettingsContent from "@/components/settings/settings-content";
import { resolveMaxChatQuestions } from "@/lib/subscription";

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      username: true,
      role: true,
      activityVisibility: true,
      showRatingsInActivity: true,
      showReviewsInActivity: true,
      showListsInActivity: true,
      showPlaylistsInActivity: true,
      showWatchedInActivity: true,
      showLikedInActivity: true,
      showFollowedInActivity: true,
      emailNotifications: true,
      pushNotifications: true,
      notifyOnNewFollowers: true,
      notifyOnNewReviews: true,
      notifyOnListUpdates: true,
      notifyOnPlaylistUpdates: true,
      notifyOnActivityLikes: true,
      notifyOnMentions: true,
      notifyOnForumReplies: true,
      notifyOnForumMentions: true,
      notifyOnForumSubscriptions: true,
      youtubeCardStyle: true,
      chatQuota: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
      stripeSubscriptionCurrentPeriodEnd: true,
      preferences: {
        select: {
          favoriteGenres: true,
          onboardingCompleted: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/onboarding");
  }

  const aiChatQuestionCount = await db.aiChatEvent.count({
    where: { userId: user.id },
  });

  const aiChatMaxQuestions = resolveMaxChatQuestions(
    user.chatQuota,
    user.stripeSubscriptionStatus,
  );

  return <SettingsContent 
    user={{
      ...user,
      stripeSubscriptionCurrentPeriodEnd:
        user.stripeSubscriptionCurrentPeriodEnd?.toISOString() ?? null,
      aiChatQuestionCount,
      aiChatMaxQuestions,
    }} 
    preferences={user.preferences} 
    activitySettings={{
      activityVisibility: user.activityVisibility || "PUBLIC",
      showRatingsInActivity: user.showRatingsInActivity ?? true,
      showReviewsInActivity: user.showReviewsInActivity ?? true,
      showListsInActivity: user.showListsInActivity ?? true,
      showPlaylistsInActivity: user.showPlaylistsInActivity ?? true,
      showWatchedInActivity: user.showWatchedInActivity ?? true,
      showLikedInActivity: user.showLikedInActivity ?? true,
      showFollowedInActivity: user.showFollowedInActivity ?? true,
    }}
    notificationSettings={{
      emailNotifications: user.emailNotifications ?? true,
      pushNotifications: user.pushNotifications ?? true,
      notifyOnNewFollowers: user.notifyOnNewFollowers ?? true,
      notifyOnNewReviews: user.notifyOnNewReviews ?? true,
      notifyOnListUpdates: user.notifyOnListUpdates ?? true,
      notifyOnPlaylistUpdates: user.notifyOnPlaylistUpdates ?? true,
      notifyOnActivityLikes: user.notifyOnActivityLikes ?? true,
      notifyOnMentions: user.notifyOnMentions ?? true,
      notifyOnForumReplies: user.notifyOnForumReplies ?? true,
      notifyOnForumMentions: user.notifyOnForumMentions ?? true,
      notifyOnForumSubscriptions: user.notifyOnForumSubscriptions ?? true,
    }}
    youtubeCardStyle={user.youtubeCardStyle || "centered"}
  />;
}

