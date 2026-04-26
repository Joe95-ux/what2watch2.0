export const PUSHER_EVENTS = {
  FORUM_POST_UPDATED: "forum.post.updated",
  ACTIVITY_FEED_UPDATED: "activity.feed.updated",
  LIST_UPDATED: "list.updated",
  PLAYLIST_UPDATED: "playlist.updated",
  YOUTUBE_CHANNEL_LIST_UPDATED: "youtube.channel-list.updated",
  LIST_ANALYTICS_UPDATED: "analytics.list.updated",
  PLAYLIST_ANALYTICS_UPDATED: "analytics.playlist.updated",
  YOUTUBE_LIST_ANALYTICS_UPDATED: "analytics.youtube-list.updated",
  REVIEWS_UPDATED: "reviews.updated",
  CONTENT_REACTIONS_UPDATED: "content.reactions.updated",
  LIST_COMMENTS_UPDATED: "list.comments.updated",
  VIEWING_LOG_COMMENTS_UPDATED: "viewing-log.comments.updated",
  GENERAL_NOTIFICATIONS_CHANGED: "notifications.general.changed",
  FORUM_NOTIFICATIONS_CHANGED: "notifications.forum.changed",
  YOUTUBE_NOTIFICATIONS_CHANGED: "notifications.youtube.changed",
  WATCHING_DASHBOARD_UPDATED: "watching.dashboard.updated",
  WATCHING_TITLE_UPDATED: "watching.title.updated",
} as const;

export function getForumPostChannelName(postId: string) {
  return `forum-post-${postId}`;
}

export function getActivityFeedChannelName() {
  return "activity-feed-global";
}

export function getListChannelName(listId: string) {
  return `list-${listId}`;
}

export function getPlaylistChannelName(playlistId: string) {
  return `playlist-${playlistId}`;
}

export function getYouTubeChannelListChannelName(listId: string) {
  return `youtube-channel-list-${listId}`;
}

export function getYouTubeChannelListsGlobalChannelName() {
  return "youtube-channel-lists-global";
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

export function getWatchingDashboardChannelName() {
  return "watching-dashboard-global";
}

export function getWatchingTitleChannelName(mediaType: "movie" | "tv", tmdbId: number) {
  return `watching-title-${mediaType}-${tmdbId}`;
}
