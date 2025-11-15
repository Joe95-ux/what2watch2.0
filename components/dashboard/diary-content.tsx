"use client";

import { useState, useMemo } from "react";
import { useViewingLogs, useDeleteViewingLog, type ViewingLog } from "@/hooks/use-viewing-logs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, Trash2, Calendar, Film, Tv } from "lucide-react";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function DiaryContent() {
  const { data: logs = [], isLoading } = useViewingLogs();
  const deleteLog = useDeleteViewingLog();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<ViewingLog | null>(null);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: Record<string, ViewingLog[]> = {};
    logs.forEach((log) => {
      const dateKey = format(new Date(log.watchedAt), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });
    return groups;
  }, [logs]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));
  }, [groupedLogs]);

  const handleDeleteClick = (log: ViewingLog) => {
    setLogToDelete(log);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!logToDelete) return;
    try {
      await deleteLog.mutateAsync(logToDelete.id);
      toast.success("Entry deleted from diary");
      setDeleteDialogOpen(false);
      setLogToDelete(null);
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const handleLogClick = (log: ViewingLog) => {
    router.push(`/${log.mediaType}/${log.tmdbId}`);
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Film Diary</h1>
          <p className="text-muted-foreground">
            {logs.length} {logs.length === 1 ? "entry" : "entries"} in your viewing history
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Your diary is empty</h3>
          <p className="text-muted-foreground">
            Start logging films you&apos;ve watched to build your viewing history.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((dateKey) => {
            const dateLogs = groupedLogs[dateKey];
            const date = new Date(dateKey);
            const formattedDate = format(date, "EEEE, MMMM d, yyyy");

            return (
              <div key={dateKey} className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground border-b pb-2">
                  {formattedDate}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {dateLogs.map((log) => (
                    <div
                      key={log.id}
                      className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handleLogClick(log)}
                    >
                      <div className="relative aspect-[2/3] bg-muted">
                        {log.posterPath ? (
                          <Image
                            src={getPosterUrl(log.posterPath)}
                            alt={log.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {log.mediaType === "movie" ? (
                              <Film className="h-12 w-12 text-muted-foreground" />
                            ) : (
                              <Tv className="h-12 w-12 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(log);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold line-clamp-2 flex-1">{log.title}</h3>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {log.mediaType === "movie" ? (
                              <Film className="h-4 w-4" />
                            ) : (
                              <Tv className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(log.watchedAt), "h:mm a")}</span>
                        </div>
                        {log.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{logToDelete?.title}&quot; from your diary? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteLog.isPending}>
              {deleteLog.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

