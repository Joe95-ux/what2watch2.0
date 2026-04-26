export type WatchingStatus = "WATCHING_NOW" | "JUST_FINISHED" | "STOPPED";
export type WatchingMediaType = "movie" | "tv";
export type WatchingVisibility = "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";

export type WatchingThoughtDTO = {
  id: string;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
  reactionCount: number;
  replyCount: number;
  myReactions: string[];
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export type WatchingSessionDTO = {
  id: string;
  userId: string;
  tmdbId: number;
  mediaType: WatchingMediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  releaseYear: number | null;
  creatorOrDirector: string | null;
  runtimeMinutes: number | null;
  status: WatchingStatus;
  visibility: WatchingVisibility;
  progressPercent: number | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  thoughts: WatchingThoughtDTO[];
};

export type WatchingDashboardResponse = {
  currentSession: WatchingSessionDTO | null;
  watchingNow: WatchingSessionDTO[];
  justFinished: WatchingSessionDTO[];
  alsoWatchingCurrent: WatchingSessionDTO[];
  trendingTonight: Array<{
    tmdbId: number;
    mediaType: WatchingMediaType;
    title: string;
    posterPath: string | null;
    releaseYear: number | null;
    watchingCount: number;
  }>;
};

export type WatchingTitlePresenceResponse = {
  tmdbId: number;
  mediaType: WatchingMediaType;
  watcherCount: number;
  isCurrentUserWatching: boolean;
  watchers: Array<{
    sessionId: string;
    userId: string;
    startedAt: string;
    progressPercent: number | null;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
  }>;
  recentThoughts: Array<{
    thoughtId: string;
    sessionId: string;
    content: string;
    createdAt: string;
    isSpoiler: false;
    reactionCount: number;
    replyCount: number;
    myReactions: string[];
    sessionStatus: WatchingStatus;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
  }>;
  spoilerThoughts: Array<{
    thoughtId: string;
    sessionId: string;
    content: string;
    createdAt: string;
    isSpoiler: true;
    reactionCount: number;
    replyCount: number;
    myReactions: string[];
    sessionStatus: WatchingStatus;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
  }>;
};

