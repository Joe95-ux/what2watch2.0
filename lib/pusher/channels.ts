export const PUSHER_EVENTS = {
  FORUM_POST_UPDATED: "forum.post.updated",
  GENERAL_NOTIFICATIONS_CHANGED: "notifications.general.changed",
  FORUM_NOTIFICATIONS_CHANGED: "notifications.forum.changed",
  YOUTUBE_NOTIFICATIONS_CHANGED: "notifications.youtube.changed",
} as const;

export function getForumPostChannelName(postId: string) {
  return `forum-post-${postId}`;
}

export function getUserChannelName(userId: string) {
  return `private-user-${userId}`;
}
