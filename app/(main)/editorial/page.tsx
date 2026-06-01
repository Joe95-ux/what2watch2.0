import EditorialPageClient from "@/components/editorial/editorial-page-client";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Editors' lists",
  description: "Explore curated movie and TV lists from the What2Watch editors.",
  path: "/editorial",
});

export default function EditorialPage() {
  return <EditorialPageClient />;
}
