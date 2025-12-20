"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePostHistory } from "@/hooks/use-forum-post-history";
import { useRevertPost } from "@/hooks/use-forum-post-revert";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { History, RotateCcw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PostHistoryDialogProps {
  postId: string | null;
  isOpen: boolean;
  onClose: () => void;
  postAuthorId?: string; // To check if current user can revert
}

export function PostHistoryDialog({ postId, isOpen, onClose, postAuthorId }: PostHistoryDialogProps) {
  const { data, isLoading, refetch } = usePostHistory(postId, 50);
  const revertPost = useRevertPost();
  const [expandedRevision, setExpandedRevision] = useState<string | null>(null);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [revisionToRevert, setRevisionToRevert] = useState<string | null>(null);

  // Prevent dialog from closing while revert is in progress
  const handleRevertDialogChange = (open: boolean) => {
    if (!revertPost.isPending) {
      setRevertDialogOpen(open);
      if (!open) {
        setRevisionToRevert(null);
      }
    }
  };

  const handleRevertClick = (revisionId: string) => {
    setRevisionToRevert(revisionId);
    setRevertDialogOpen(true);
  };

  const handleRevertConfirm = () => {
    if (!postId || !revisionToRevert) return;

    revertPost.mutate(
      { postId, revisionId: revisionToRevert },
      {
        onSuccess: () => {
          // Refetch post history
          refetch();
          // Close dialogs after successful revert
          setRevertDialogOpen(false);
          setRevisionToRevert(null);
          onClose();
        },
      }
    );
  };

  const canRevert = (revision: any) => {
    // Only allow reverting if user is the post author
    // and this is not the most recent revision (we'll show current post as the first item)
    return postAuthorId && revision.editedBy === postAuthorId;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Edit History
          </DialogTitle>
          <DialogDescription>
            View and restore previous revisions of this post
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-full w-0.5 mt-2" />
                  </div>
                  <div className="flex-1 space-y-2 pb-6">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data?.revisions || data.revisions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No edit history available
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-0">
                {data.revisions.map((revision, index) => {
                  const isExpanded = expandedRevision === revision.id;
                  const canRevertThis = canRevert(revision);
                  const isLatest = index === 0;

                  return (
                    <div
                      key={revision.id}
                      className="relative flex gap-4 pb-6 last:pb-0"
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full border-2 flex items-center justify-center",
                            isLatest
                              ? "bg-primary border-primary"
                              : "bg-background border-border"
                          )}
                        >
                          {isLatest ? (
                            <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {revision.editor && (
                              <>
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                  <AvatarImage src={revision.editor.avatarUrl || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {revision.editor.username?.[0] || revision.editor.displayName?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium truncate">
                                  {revision.editor.username || revision.editor.displayName || "Unknown"}
                                </span>
                              </>
                            )}
                            {!revision.editor && (
                              <span className="text-sm text-muted-foreground">System</span>
                            )}
                            {isLatest && (
                              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(revision.editedAt), { addSuffix: true })}
                            </span>
                            {canRevertThis && !isLatest && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevertClick(revision.id)}
                                disabled={revertPost.isPending}
                                className="h-7 text-xs"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Revert
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mt-2">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Title:</span>
                            <p className="text-sm mt-1 font-medium">{revision.title}</p>
                          </div>
                          
                          {revision.content && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">Content:</span>
                              <p className={cn(
                                "text-sm mt-1 text-muted-foreground",
                                isExpanded ? "" : "line-clamp-3"
                              )}>
                                {revision.content}
                              </p>
                              {revision.content.length > 150 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedRevision(isExpanded ? null : revision.id)}
                                  className="h-6 text-xs mt-1 px-0"
                                >
                                  {isExpanded ? "Show less" : "Show more"}
                                </Button>
                              )}
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Revert Confirmation Dialog */}
      <AlertDialog open={revertDialogOpen} onOpenChange={handleRevertDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to this revision?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revert to this revision? This will create a new revision with the current content, and the post will be restored to this version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setRevertDialogOpen(false);
                setRevisionToRevert(null);
              }}
              disabled={revertPost.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevertConfirm}
              disabled={revertPost.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revertPost.isPending ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Reverting...
                </>
              ) : (
                "Revert"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
