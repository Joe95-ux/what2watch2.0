"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatQuotaManagementTable } from "@/components/admin/chat-quota-management-table";

export function GeneralModerationContent() {
  const [activeTab, setActiveTab] = useState("chat-quota");

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">General Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Moderate user reviews, comments, and other content across the platform
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="chat-quota" className="cursor-pointer">
              Chat Quota Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat-quota" className="mt-0">
            <ChatQuotaManagementTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

