export function getChannelProfilePath(channelId: string, slug?: string | null) {
  if (slug) {
    const withoutAt = slug.startsWith("@") ? slug.slice(1) : slug;
    return `/youtube-channel/${encodeURIComponent(withoutAt)}`;
  }
  return `/youtube-channel/${channelId}`;
}

