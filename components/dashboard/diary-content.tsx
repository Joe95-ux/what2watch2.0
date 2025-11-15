"use client";

import { useState, useMemo, useEffect } from "react";
import { useViewingLogs, useDeleteViewingLog, useUpdateViewingLog, type ViewingLog } from "@/hooks/use-viewing-logs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trash2, Film, Tv, Edit, Table2, Grid3x3, CalendarIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function DiaryContent() {
  const { data: logs = [], isLoading } = useViewingLogs();
  const deleteLog = useDeleteViewingLog();
  const updateLog = useUpdateViewingLog();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<ViewingLog | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [logToEdit, setLogToEdit] = useState<ViewingLog | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

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
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const handleLogClick = (log: ViewingLog) => {
    router.push(`/${log.mediaType}/${log.tmdbId}`);
  };

  const handleEditClick = (log: ViewingLog, e: React.MouseEvent) => {
    e.stopPropagation();
    setLogToEdit(log);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (watchedDate: Date, notes: string) => {
    if (!logToEdit) return;
    try {
      await updateLog.mutateAsync({
        logId: logToEdit.id,
        watchedAt: watchedDate.toISOString(),
        notes: notes.trim() || null,
      });
      toast.success("Entry updated");
      setEditDialogOpen(false);
      setLogToEdit(null);
    } catch {
      toast.error("Failed to update entry");
    }
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Film Diary</h1>
          <p className="text-muted-foreground">
            {logs.length} {logs.length === 1 ? "entry" : "entries"} in your viewing history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <Table2 className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Your diary is empty</h3>
          <p className="text-muted-foreground">
            Start logging films you&apos;ve watched to build your viewing history.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="space-y-12">
          {sortedDates.map((dateKey) => {
            const dateLogs = groupedLogs[dateKey];
            const date = new Date(dateKey);
            const formattedDate = format(date, "MMM d, yyyy");
            const dayName = format(date, "EEEE");

            return (
              <div key={dateKey} className="relative">
                {/* Timeline line - horizontal line connecting all dates */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border hidden md:block" />
                
                {/* Date header with calendar icon */}
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex-shrink-0">
                    <CalendarIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{dayName}</h2>
                    <p className="text-sm text-muted-foreground">{formattedDate}</p>
                  </div>
                </div>

                {/* Horizontal card row - cards hang from the date */}
                <div className="flex flex-wrap gap-4 ml-20 md:ml-24">
                  {dateLogs.map((log) => (
                    <div
                      key={log.id}
                      className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer flex-shrink-0"
                      onClick={() => handleLogClick(log)}
                      style={{ width: "160px" }}
                    >
                      {/* Connection line from date to card */}
                      <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-0.5 bg-border hidden md:block" />
                      
                      <div className="relative aspect-[2/3] bg-muted rounded-lg overflow-hidden">
                        {log.posterPath ? (
                          <Image
                            src={getPosterUrl(log.posterPath)}
                            alt={log.title}
                            fill
                            className="object-cover"
                            sizes="160px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {log.mediaType === "movie" ? (
                              <Film className="h-8 w-8 text-muted-foreground" />
                            ) : (
                              <Tv className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80"
                            onClick={(e) => handleEditClick(log, e)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(log);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h3 className="font-semibold text-xs line-clamp-2 flex-1">{log.title}</h3>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {log.mediaType === "movie" ? (
                              <Film className="h-3 w-3" />
                            ) : (
                              <Tv className="h-3 w-3" />
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{format(new Date(log.watchedAt), "h:mm a")}</span>
                        </div>
                        {log.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Film
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Date Watched
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer group"
                    onClick={() => handleLogClick(log)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {log.posterPath ? (
                          <div className="relative w-16 h-24 rounded overflow-hidden flex-shrink-0 bg-muted">
                            <Image
                              src={getPosterUrl(log.posterPath)}
                              alt={log.title}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-24 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                            {log.mediaType === "movie" ? (
                              <Film className="h-6 w-6 text-muted-foreground" />
                            ) : (
                              <Tv className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {log.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-muted-foreground capitalize">{log.mediaType}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{format(new Date(log.watchedAt), "MMM d, yyyy h:mm a")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                        {log.notes || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleEditClick(log, e)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(log);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* Edit Dialog */}
      {logToEdit && (
        <EditLogDialog
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setLogToEdit(null);
          }}
          log={logToEdit}
          onSubmit={handleEditSubmit}
          isPending={updateLog.isPending}
        />
      )}
    </div>
  );
}

// Edit Log Dialog Component
interface EditLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  log: ViewingLog;
  onSubmit: (watchedDate: Date, notes: string) => void;
  isPending: boolean;
}

function EditLogDialog({ isOpen, onClose, log, onSubmit, isPending }: EditLogDialogProps) {
  const [watchedDate, setWatchedDate] = useState<Date>(new Date(log.watchedAt));
  const [notes, setNotes] = useState(log.notes || "");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Reset form when log changes
  useEffect(() => {
    if (isOpen && log) {
      setWatchedDate(new Date(log.watchedAt));
      setNotes(log.notes || "");
    }
  }, [isOpen, log]);

  const handleSubmit = () => {
    onSubmit(watchedDate, notes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Entry</DialogTitle>
          <DialogDescription>
            Update when you watched &quot;{log.title}&quot; and your notes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="watched-date">Date Watched</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedDate ? format(watchedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchedDate}
                  onSelect={(date) => {
                    if (date) {
                      setWatchedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add your thoughts, rating, or any notes about this viewing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

