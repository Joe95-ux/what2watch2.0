"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagementTable } from "./user-management-table";
import { PostModerationTable } from "./post-moderation-table";
import { CategoryManagement } from "./category-management";
import { ReportsManagementTable } from "./reports-management-table";
import { Users, MessageSquare, Hash, Flag } from "lucide-react";

export function ForumAdminContent() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Forum Administration</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, moderate posts, and configure forum categories
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="users" className="cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="posts" className="cursor-pointer">
              <MessageSquare className="mr-2 h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="categories" className="cursor-pointer">
              <Hash className="mr-2 h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="reports" className="cursor-pointer">
              <Flag className="mr-2 h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UserManagementTable />
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <PostModerationTable />
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <ReportsManagementTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

