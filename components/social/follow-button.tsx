"use client";

import { Button } from "@/components/ui/button";
import { useFollowUser, useUnfollowUser, useIsFollowing } from "@/hooks/use-follow";
import { UserPlus, UserMinus, UserRound, UserRoundMinus, UserRoundPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";

interface FollowButtonProps {
  userId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
  /** Round user icons (members cards): UserRound / UserRoundMinus */
  /** roundPlus: list & playlist views — UserRoundPlus / UserRoundMinus, label "Following" when followed */
  iconVariant?: "default" | "round" | "roundPlus";
}

export function FollowButton({
  userId,
  variant = "default",
  size = "default",
  showIcon = true,
  className,
  iconVariant = "default",
}: FollowButtonProps) {
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const { data: followStatus, isLoading: isLoadingStatus } = useIsFollowing(userId);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const isFollowing = followStatus?.isFollowing ?? false;
  const isLoading = isLoadingStatus || followMutation.isPending || unfollowMutation.isPending;

  const handleClick = () => {
    // Check if user is authenticated
    if (!isSignedIn) {
      // Prompt sign-in for unauthenticated users
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      } else {
        toast.error("Please sign in to follow users");
      }
      return;
    }

    if (isFollowing) {
      unfollowMutation.mutate(userId, {
        onSuccess: () => {
          toast.success("Unfollowed user");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to unfollow user");
        },
      });
    } else {
      followMutation.mutate(userId, {
        onSuccess: () => {
          toast.success("Following user");
        },
        onError: (error) => {
          // Handle 401 Unauthorized specifically
          if (error.message?.includes("Unauthorized") || error.message?.includes("401")) {
            if (openSignIn) {
              openSignIn({
                afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
              });
            } else {
              toast.error("Please sign in to follow users");
            }
          } else {
            toast.error(error.message || "Failed to follow user");
          }
        },
      });
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant={isFollowing ? "outline" : variant}
      size={size}
      className={className ?? "cursor-pointer"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showIcon ? (
        isFollowing ? (
          <>
            {iconVariant === "round" || iconVariant === "roundPlus" ? (
              <UserRoundMinus className="h-4 w-4 mr-2" />
            ) : (
              <UserMinus className="h-4 w-4 mr-2" />
            )}
            {iconVariant === "roundPlus" ? "Following" : "Unfollow"}
          </>
        ) : (
          <>
            {iconVariant === "roundPlus" ? (
              <UserRoundPlus className="h-4 w-4 mr-2" />
            ) : iconVariant === "round" ? (
              <UserRound className="h-4 w-4 mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Follow
          </>
        )
      ) : (
        isFollowing ? (iconVariant === "roundPlus" ? "Following" : "Unfollow") : "Follow"
      )}
    </Button>
  );
}

