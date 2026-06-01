import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Top rated movies & TV",
  description: "Browse top-rated movies and TV shows with scores and where-to-watch info.",
  path: "/top-rated",
});

export default function TopRatedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
