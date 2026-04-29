type WatchingPulseSubtitleProps = {
  watchMomentLabel: string;
  friendsOnlineCount: number;
  activeWatchingPeopleCount: number;
};

export function WatchingPulseSubtitle({
  watchMomentLabel,
  friendsOnlineCount,
  activeWatchingPeopleCount,
}: WatchingPulseSubtitleProps) {
  return (
    <p className="text-sm text-muted-foreground sm:text-base">
      {watchMomentLabel} · {friendsOnlineCount.toLocaleString()} friends online · Global pulse:{" "}
      {activeWatchingPeopleCount.toLocaleString()} watching now.
    </p>
  );
}
