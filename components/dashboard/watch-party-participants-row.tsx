"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { WatchPartyRoomParticipant } from "@/hooks/use-watch-party-room-summary";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type WatchPartyParticipantsRowProps = {
  participants: WatchPartyRoomParticipant[];
  /** Static compact line (no expand). */
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

function ParticipantAvatarStack({
  members,
  size = "md",
}: {
  members: WatchPartyRoomParticipant[];
  size?: "sm" | "md";
}) {
  const avatarClass = size === "sm" ? "h-6 w-6 border" : "h-7 w-7 border-2";
  return (
    <div className="flex shrink-0 -space-x-2">
      {members.slice(0, 6).map((p) => (
        <Avatar
          key={p.userId}
          className={cn(avatarClass, "border-background")}
          title={p.role === "HOST" ? `${p.name} (host)` : p.name}
        >
          <AvatarImage src={p.avatarUrl ?? undefined} alt={p.name} />
          <AvatarFallback className="text-[10px]">{p.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

export function WatchPartyParticipantsRow({
  participants,
  variant = "compact",
  className,
}: WatchPartyParticipantsRowProps) {
  const members = participants ?? [];
  const [expanded, setExpanded] = useState(false);

  if (!members.length) return null;

  if (variant === "panel") {
    const countLabel = `${members.length} ${members.length === 1 ? "person" : "people"} in party`;
    return (
      <div className={cn("space-y-1", className)}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent px-1 py-1.5 text-left transition-colors",
            "hover:border-border/60 hover:bg-muted/40",
            expanded && "border-border/50 bg-muted/25"
          )}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse party list" : "Expand party list"}
        >
          <ParticipantAvatarStack members={members} size="sm" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground">{countLabel}</span>
            {!expanded ? (
              <span className="hidden text-muted-foreground sm:inline">
                {" · "}
                {formatPartyRoster(members, 2)}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <ul className="space-y-1 border-t border-border/40 pt-2">
              {members.map((p) => (
                <li key={p.userId} className="flex items-center gap-2 px-1 text-[12px]">
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
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <ParticipantAvatarStack members={members} />
      <p className="min-w-0 text-[12px] leading-snug text-muted-foreground">
        <span className="font-medium text-foreground">Watch party · </span>
        {formatPartyRoster(members, 3)}
      </p>
    </div>
  );
}
