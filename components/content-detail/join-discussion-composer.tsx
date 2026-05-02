"use client";

import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type JoinDiscussionComposerProps = {
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  content: string;
  onContentChange: (value: string) => void;
  spoiler: boolean;
  onSpoilerChange: (value: boolean) => void;
  onSubmit: () => void | Promise<void>;
  isSubmitting: boolean;
  disabled?: boolean;
  /** When false, still show CTA but disable interaction (e.g. signed-out). */
  canPost?: boolean;
  isTitleDiscussion?: boolean;
};

export function JoinDiscussionComposer({
  expanded,
  onExpandedChange,
  content,
  onContentChange,
  spoiler,
  onSpoilerChange,
  onSubmit,
  isSubmitting,
  isTitleDiscussion = false,
  disabled = false,
  canPost = true,
}: JoinDiscussionComposerProps) {
  const blocked = disabled || !canPost;

  return (
    <div className={cn("space-y-3", isTitleDiscussion ? "flex flex-col" : "")}>
      {!expanded ? (
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 sm:w-auto dark:border-primary/50 dark:bg-primary/10 dark:hover:bg-primary/15"
          onClick={() => {
            if (blocked) return;
            onExpandedChange(true);
          }}
          disabled={blocked}
          aria-expanded={false}
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0" aria-hidden />
          Join the discussion
        </button>
      ) : null}

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "rounded-[15px] border border-border/60 bg-muted/25 p-3 pb-4 dark:border-border/50 dark:bg-muted/15",
              expanded ? "animate-in fade-in-0 slide-in-from-top-1 duration-300" : ""
            )}
          >
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Share a thought — no spoilers unless you mark it below"
              className="min-h-[100px] resize-none border-border/60 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={blocked || isSubmitting}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
                <Checkbox
                  checked={spoiler}
                  onCheckedChange={(v) => onSpoilerChange(Boolean(v))}
                  disabled={blocked || isSubmitting}
                />
                Spoiler
              </label>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 cursor-pointer rounded-[20px] px-4 text-[13px]"
                  disabled={blocked || isSubmitting}
                  onClick={() => onExpandedChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 cursor-pointer rounded-[20px] px-4 text-[13px]"
                  disabled={blocked || isSubmitting || !content.trim()}
                  onClick={() => void onSubmit()}
                >
                  {isSubmitting ? "Commenting..." : "Commment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
