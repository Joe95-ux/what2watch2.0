"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForumNotificationsTab } from "@/components/notifications/forum-notifications-tab";
import { YouTubeNotificationsTab } from "@/components/notifications/youtube-notifications-tab";
import { GeneralNotificationsTab } from "@/components/notifications/general-notifications-tab";

export default function DashboardNotificationsPage() {
  const [activeTab, setActiveTab] = useState<"forum" | "general" | "youtube">("forum");

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all your notifications in one place
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "forum" | "general" | "youtube")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="forum">Forum</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
        </TabsList>
        <TabsContent value="forum" className="mt-6">
          <ForumNotificationsTab />
        </TabsContent>
        <TabsContent value="general" className="mt-6">
          <GeneralNotificationsTab />
        </TabsContent>
        <TabsContent value="youtube" className="mt-6">
          <YouTubeNotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

