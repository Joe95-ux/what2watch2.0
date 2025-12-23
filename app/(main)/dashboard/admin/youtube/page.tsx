import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import AdminYouTubeManagementContent from "@/components/admin/youtube/admin-youtube-management-content";

export const metadata = {
  title: "Admin YouTube Channel Management | what2watch",
  description: "Admin panel for managing YouTube channels and Nollywood collection.",
};

export default async function AdminYouTubeManagementPage() {
  try {
    await requireAdmin();
  } catch (error) {
    redirect("/dashboard");
  }

  return <AdminYouTubeManagementContent />;
}

