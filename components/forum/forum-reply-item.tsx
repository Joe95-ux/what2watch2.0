"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateReplyForm } from "./create-reply-form";
import { ForumReplyLikeButton } from "./forum-reply-like-button";
import { useUser } from "@clerk/nextjs";

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

interface ForumReplyItemProps {
  reply: ForumReply;
  postId: string;
  depth?: number;
}

export function ForumReplyItem({ reply, postId, depth = 0 }: ForumReplyItemProps) {
  const { isSignedIn } = useUser();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const maxDepth = 3; // Maximum nesting depth

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={depth > 0 ? "ml-8 border-l-2 border-border pl-4" : ""}>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={reply.author.avatarUrl} alt={reply.author.displayName} />
            <AvatarFallback>{getInitials(reply.author.displayName)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <Link
                  href={`/users/${reply.author.username || reply.author.id}`}
                  className="font-semibold hover:text-primary transition-colors"
                >
                  {reply.author.displayName}
                </Link>
                <span className="text-xs text-muted-foreground ml-2">
                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
              <p className="whitespace-pre-wrap">{reply.content}</p>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <ForumReplyLikeButton replyId={reply.id} />
              {isSignedIn && depth < maxDepth && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="h-8 cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Reply
                </Button>
              )}
            </div>

            {/* Reply Form */}
            {showReplyForm && (
              <div className="mt-4">
                <CreateReplyForm
                  postId={postId}
                  parentReplyId={reply.id}
                  onSuccess={() => setShowReplyForm(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {reply.replies && reply.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {reply.replies.map((nestedReply) => (
            <ForumReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              postId={postId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

