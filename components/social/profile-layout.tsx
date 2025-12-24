"use client";

import { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ProfileLayoutProps {
  // Banner/Cover
  bannerGradient?: string; // CSS gradient or color
  bannerUrl?: string | null; // Custom banner image URL
  
  // User Info
  displayName: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  initials: string;
  
  // Stats
  followersCount: number;
  followingCount: number;
  playlistsCount: number;
  listsCount?: number;
  
  // Actions
  actionButton?: ReactNode; // Follow button or Edit button
  
  // Tabs
  tabs: ReactNode;
  tabContent: ReactNode;
  
  // Back button
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function ProfileLayout({
  bannerGradient = "#061E1C",
  bannerUrl,
  displayName,
  username,
  bio,
  avatarUrl,
  initials,
  followersCount,
  followingCount,
  playlistsCount,
  listsCount = 0,
  actionButton,
  tabs,
  tabContent,
  showBackButton = true,
  onBack,
}: ProfileLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background sm:mx-4">
      {/* Banner/Cover Section - Full width, edge-to-edge */}
      <div className="relative h-[150px] max-w-[70rem] mx-0 sm:mx-auto sm:mt-[1rem] sm:mb-0 sm:rounded-[25px] overflow-hidden">
        {bannerUrl ? (
          <>
            <Image
              src={bannerUrl}
              alt="Banner"
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />
          </>
        ) : (
          <>
            {/* Gradient background */}
            <div 
              className="w-full h-full" 
              style={{ background: bannerGradient }}
            />
            {/* Dark overlay - reduced opacity */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />
          </>
        )}
        
        {/* Back Button - Positioned on cover */}
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack || (() => router.back())}
            className="absolute top-4 left-4 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border-0 text-white cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Profile Info Section - Constrained width, centered */}
      <div className="container max-w-[70rem] mx-auto px-4 sm:px-6">
        {/* Avatar - Overlapping banner, positioned to the left */}
        <div className="relative -mt-16 sm:-mt-10 mb-4">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-3xl sm:text-4xl">{initials}</AvatarFallback>
          </Avatar>
        </div>

        {/* Profile Info and Action Button */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">{displayName}</h1>
            {username && (
              <p className="text-base sm:text-lg text-muted-foreground mb-3">@{username}</p>
            )}
            {bio && (
              <p className="text-sm sm:text-base text-foreground mb-3 whitespace-pre-wrap break-words">
                {bio}
              </p>
            )}
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span>
                <span className="font-semibold text-foreground">{followersCount}</span>{" "}
                {followersCount === 1 ? "follower" : "followers"}
              </span>
              <span>
                <span className="font-semibold text-foreground">{followingCount}</span> following
              </span>
              <span>
                <span className="font-semibold text-foreground">{playlistsCount}</span>{" "}
                {playlistsCount === 1 ? "playlist" : "playlists"}
              </span>
              {listsCount > 0 && (
                <span>
                  <span className="font-semibold text-foreground">{listsCount}</span>{" "}
                  {listsCount === 1 ? "list" : "lists"}
                </span>
              )}
            </div>
          </div>

          {/* Action Button (Follow/Edit) */}
          {actionButton && (
            <div className="flex-shrink-0">
              {actionButton}
            </div>
          )}
        </div>

        {/* Tabs Section */}
        <div className="w-fit">
          {tabs}
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {tabContent}
        </div>
      </div>
    </div>
  );
}

