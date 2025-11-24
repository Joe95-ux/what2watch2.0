export function getChannelProfilePath(channelId: string, slug?: string | null) {
  if (slug) {
    const normalized = slug.startsWith("@") ? slug : `@${slug}`;
    return `/youtube-channel/${encodeURIComponent(normalized)}`;
  }
  return `/youtube-channel/${channelId}`;
}

