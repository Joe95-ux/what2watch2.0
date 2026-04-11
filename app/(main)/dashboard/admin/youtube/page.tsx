import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import type { Metadata } from "next";
import AdminYouTubeManagementContent from "@/components/admin/youtube/admin-youtube-management-content";

export const metadata: Metadata = {
  title: "Admin — YouTube channels | what2watch",
  description:
    "Internal tools to manage YouTube channel data and collections in what2watch.",
  robots: { index: false, follow: false },
};

export default async function AdminYouTubeManagementPage() {
  try {
    await requireAdmin();
  } catch (error) {
    redirect("/dashboard");
  }

  return <AdminYouTubeManagementContent />;
}

