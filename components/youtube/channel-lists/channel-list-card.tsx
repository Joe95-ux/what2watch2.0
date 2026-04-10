"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Edit, Facebook, Link2, Mail, MoreVertical, Share2, Trash2, Twitter } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { YouTubeChannelList } from "@/hooks/use-youtube-channel-lists";
import { useDeleteYouTubeChannelList } from "@/hooks/use-youtube-channel-lists";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChannelListCardProps {
  list: YouTubeChannelList;
  className?: string;
  onEdit?: (list: YouTubeChannelList) => void;
  onDeleted?: () => void;
}

export function ChannelListCard({ list, className, onEdit, onDeleted }: ChannelListCardProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const deleteList = useDeleteYouTubeChannelList();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const ownerName = list.user?.username || list.user?.displayName || "Unknown curator";
  const isOwner = Boolean(list.viewerState?.isOwner);
  // Show more channel posters in stack (responsive count)
  const channelAvatars = list.items.slice(0, isMobile ? 8 : 10);
  const detailUrl = useMemo(() => `/youtube-channel/lists/${list.id}`, [list.id]);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}${detailUrl}` : detailUrl;

  const handleSocialShare = async (
    platform: "facebook" | "twitter" | "whatsapp" | "email" | "link"
  ) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(list.name);
    const encodedDescription = encodeURIComponent(list.description || "");

    if (platform === "link") {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("List link copied");
      return;
    }

    let url = "";
    if (platform === "facebook") {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else if (platform === "twitter") {
      url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${encodedDescription ? ` - ${encodedDescription}` : ""}`;
    } else if (platform === "whatsapp") {
      url = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    } else if (platform === "email") {
      const subject = encodeURIComponent(list.name);
      const body = encodeURIComponent(`${list.description || ""}\n\n${shareUrl}`);
      url = `mailto:?subject=${subject}&body=${body}`;
    }

    if (!url) return;
    if (platform === "email") {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "width=600,height=400");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteList.mutateAsync(list.id);
      toast.success("List deleted");
      setDeleteOpen(false);
      onDeleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete list");
    }
  };

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(detailUrl)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(detailUrl);
        }
      }}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-border bg-card/70 p-4 text-left transition-all hover:border-primary/60 hover:shadow-md cursor-pointer",
        className
      )}
    >
      {/* Top row: Stacked channel posters + overflow count + menu */}
      <div className="relative h-12 flex items-center pr-10">
        {channelAvatars.length > 0 ? (
          <>
            {channelAvatars.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "relative rounded-full border-2 border-background overflow-hidden bg-muted flex-shrink-0",
                  "h-10 w-10",
                  index > 0 && "-ml-5"
                )}
                style={{ zIndex: channelAvatars.length - index }}
              >
                {item.channelThumbnail ? (
                  <Image
                    src={item.channelThumbnail}
                    alt={item.channelTitle ?? "Channel"}
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {item.channelTitle?.slice(0, 2).toUpperCase() ?? "YT"}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {/* Blur effect to indicate more channels */}
            {list.items.length > channelAvatars.length && (
              <div
                className={cn(
                  "relative rounded-full border-2 border-background overflow-hidden bg-muted/60 flex-shrink-0",
                  "h-10 w-10 -ml-5 flex items-center justify-center",
                  "backdrop-blur-md"
                )}
                style={{ zIndex: 0 }}
              >
                <span className="text-xs font-semibold text-muted-foreground">
                  +{list.items.length - channelAvatars.length}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No channels</span>
          </div>
        )}

        {/* 3-dot card menu */}
        <div className="absolute right-0 top-1.5 z-20" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {isOwner && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(list);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share list
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleSocialShare("facebook")}>
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleSocialShare("twitter")}>
                    <Twitter className="h-4 w-4 mr-2" />
                    X (Twitter)
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleSocialShare("whatsapp")}>
                    <FaWhatsapp className="h-4 w-4 mr-2" />
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleSocialShare("email")}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleSocialShare("link")}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* List Title */}
      <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
        {list.name}
      </h3>

      {/* Creator */}
      <p className="text-sm text-muted-foreground">
        By {ownerName}
      </p>

      {/* Description */}
      {list.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {list.description}
        </p>
      )}
    </div>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete list?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this channel list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
            disabled={deleteList.isPending}
          >
            {deleteList.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

