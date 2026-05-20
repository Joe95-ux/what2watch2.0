"use client";

import type { WatchPartyRoomParticipant } from "@/hooks/use-watch-party-room-summary";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type WatchPartyParticipantsRowProps = {
  participants: WatchPartyRoomParticipant[];
  /** Compact single line for feed card header; expanded list in party panel. */
  variant?: "compact" | "panel";
  className?: string;
};

function formatPartyRoster(participants: WatchPartyRoomParticipant[], maxNames: number): string {
  const names = participants.map((p) =>
    p.role === "HOST" ? `${p.name} (host)` : p.name
  );
  if (names.length <= maxNames) {
    if (names.length <= 2) return names.join(" and ");
    const last = names[names.length - 1];
    return `${names.slice(0, -1).join(", ")}, and ${last}`;
  }
  const shown = names.slice(0, maxNames).join(", ");
  const remaining = participants.length - maxNames;
  return `${shown}, and ${remaining} ${remaining === 1 ? "other" : "others"}`;
}

export function WatchPartyParticipantsRow({
  participants,
  variant = "compact",
  className,
}: WatchPartyParticipantsRowProps) {
  const members = participants ?? [];
  if (!members.length) return null;

  if (variant === "panel") {
    return (
      <div className={cn("space-y-1.5", className)}>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          In this party · {members.length}
        </p>
        <ul className="max-h-28 space-y-1 overflow-y-auto pr-1">
          {members.map((p) => (
            <li key={p.userId} className="flex items-center gap-2 text-[12px]">
              <Avatar className="h-6 w-6 shrink-0 border border-background">
                <AvatarImage src={p.avatarUrl ?? undefined} alt={p.name} />
                <AvatarFallback className="text-[10px]">{p.name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 truncate font-medium text-foreground">{p.name}</span>
              {p.role === "HOST" ? (
                <span className="shrink-0 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                  Host
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <div className="flex shrink-0 -space-x-2 pt-0.5">
        {members.slice(0, 6).map((p) => (
          <Avatar
            key={p.userId}
            className="h-7 w-7 border-2 border-background"
            title={p.role === "HOST" ? `${p.name} (host)` : p.name}
          >
            <AvatarImage src={p.avatarUrl ?? undefined} alt={p.name} />
            <AvatarFallback className="text-[10px]">{p.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <p className="min-w-0 text-[12px] leading-snug text-muted-foreground">
        <span className="font-medium text-foreground">Watch party · </span>
        {formatPartyRoster(members, 3)}
      </p>
    </div>
  );
}
