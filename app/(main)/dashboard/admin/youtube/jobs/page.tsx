import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { YouTubeJobsAdminClient } from "@/components/admin/youtube-jobs-admin-client";

export const metadata: Metadata = {
  title: "YouTube Jobs | Admin | what2watch",
  description: "Manage YouTube background jobs and ingestion tasks for what2watch.",
  robots: { index: false, follow: false },
};

export default async function YouTubeJobsAdminPage() {
  try {
    await requireAdmin();
  } catch (error) {
    redirect("/dashboard");
  }

  return <YouTubeJobsAdminClient />;
}
