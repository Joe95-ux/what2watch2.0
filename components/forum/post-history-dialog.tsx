"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePostHistory } from "@/hooks/use-forum-post-history";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";

interface PostHistoryDialogProps {
  postId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PostHistoryDialog({ postId, isOpen, onClose }: PostHistoryDialogProps) {
  const { data, isLoading } = usePostHistory(postId, 50);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Edit History
          </DialogTitle>
          <DialogDescription>
            View all revisions of this post
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : !data?.revisions || data.revisions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No edit history available
            </div>
          ) : (
            <div className="space-y-4">
              {data.revisions.map((revision, index) => (
                <div
                  key={revision.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {revision.editor && (
                        <>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={revision.editor.avatarUrl || undefined} />
                            <AvatarFallback>
                              {revision.editor.displayName?.[0] || revision.editor.username?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {revision.editor.displayName || revision.editor.username || "Unknown"}
                          </span>
                        </>
                      )}
                      {!revision.editor && (
                        <span className="text-sm text-muted-foreground">System</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(revision.editedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Title:</span>
                      <p className="text-sm mt-1">{revision.title}</p>
                    </div>
                    {revision.content && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Content:</span>
                        <p className="text-sm mt-1 line-clamp-3">{revision.content}</p>
                      </div>
                    )}
                    {revision.tags.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {revision.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-muted rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {index < data.revisions.length - 1 && (
                    <div className="border-t pt-3" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

