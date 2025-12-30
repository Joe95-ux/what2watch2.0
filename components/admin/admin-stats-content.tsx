"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedbackStats } from "./feedback-stats";
import { BarChart3 } from "lucide-react";

export function AdminStatsContent() {
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Admin Stats Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View statistics and analytics for admin operations
          </p>
        </div>

        <Tabs defaultValue="feedback" className="w-full">
          <TabsList>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="mt-6">
            <FeedbackStats />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

