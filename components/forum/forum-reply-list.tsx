"use client";

import { formatDistanceToNow } from "date-fns";
import { MessageSquare, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { ForumReplyItem } from "./forum-reply-item";

interface ForumReply {
  id: string;
  content: string;
  likes: number;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  parentReplyId?: string;
  replies: ForumReply[];
  createdAt: string;
  updatedAt: string;
}

interface ForumReplyListProps {
  replies: ForumReply[];
  postId: string;
}

export function ForumReplyList({ replies, postId }: ForumReplyListProps) {
  if (replies.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No replies yet. Be the first to reply!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {replies.map((reply) => (
        <ForumReplyItem key={reply.id} reply={reply} postId={postId} />
      ))}
    </div>
  );
}

