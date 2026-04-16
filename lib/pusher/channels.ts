export const PUSHER_EVENTS = {
  FORUM_POST_UPDATED: "forum.post.updated",
  ACTIVITY_FEED_UPDATED: "activity.feed.updated",
  REVIEWS_UPDATED: "reviews.updated",
  CONTENT_REACTIONS_UPDATED: "content.reactions.updated",
  LIST_COMMENTS_UPDATED: "list.comments.updated",
  VIEWING_LOG_COMMENTS_UPDATED: "viewing-log.comments.updated",
  GENERAL_NOTIFICATIONS_CHANGED: "notifications.general.changed",
  FORUM_NOTIFICATIONS_CHANGED: "notifications.forum.changed",
  YOUTUBE_NOTIFICATIONS_CHANGED: "notifications.youtube.changed",
} as const;

export function getForumPostChannelName(postId: string) {
  return `forum-post-${postId}`;
}

export function getActivityFeedChannelName() {
  return "activity-feed-global";
}

export function getUserChannelName(userId: string) {
  return `private-user-${userId}`;
}

export function getReviewsChannelName(mediaType: "movie" | "tv", tmdbId: number) {
  return `reviews-${mediaType}-${tmdbId}`;
}

export function getContentReactionsChannelName(mediaType: "movie" | "tv", tmdbId: number) {
  return `content-reactions-${mediaType}-${tmdbId}`;
}

export function getListCommentsChannelName(listId: string) {
  return `list-comments-${listId}`;
}

export function getViewingLogCommentsChannelName(logId: string) {
  return `viewing-log-comments-${logId}`;
}
