"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouTubeChannelsTab } from "./youtube-channels-tab";
import { YouTubeListsTab } from "./youtube-lists-tab";
import { YouTubeRecentReviewsTab } from "./youtube-recent-reviews-tab";
import { YouTubeLeaderboardTab } from "./youtube-leaderboard-tab";
import { Youtube, List, MessageSquare, Trophy } from "lucide-react";

export function YouTubePageClient() {
  const [activeTab, setActiveTab] = useState("channels");

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Nav */}
      <div className="sticky top-[65px] z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start h-auto p-1 bg-transparent">
              <TabsTrigger
                value="channels"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <Youtube className="h-4 w-4 mr-2" />
                Channels
              </TabsTrigger>
              <TabsTrigger
                value="lists"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <List className="h-4 w-4 mr-2" />
                Lists
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Recent Reviews
              </TabsTrigger>
              <TabsTrigger
                value="leaderboard"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="channels" className="mt-0">
            <YouTubeChannelsTab />
          </TabsContent>
          <TabsContent value="lists" className="mt-0">
            <YouTubeListsTab />
          </TabsContent>
          <TabsContent value="reviews" className="mt-0">
            <YouTubeRecentReviewsTab />
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-0">
            <YouTubeLeaderboardTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

