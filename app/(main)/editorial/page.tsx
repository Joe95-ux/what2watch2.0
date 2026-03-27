import type { Metadata } from "next";
import EditorialPageClient from "@/components/editorial/editorial-page-client";

export const metadata: Metadata = {
  title: "What2watch.net Editors' lists | What2Watch",
  description: "Explore lists curated by our Editors.",
};

export default function EditorialPage() {
  return <EditorialPageClient />;
}
