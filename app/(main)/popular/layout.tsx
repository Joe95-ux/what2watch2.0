import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Popular movies & TV",
  description: "See what is trending in movies and TV — popular titles updated on What2Watch.",
  path: "/popular",
});

export default function PopularLayout({ children }: { children: React.ReactNode }) {
  return children;
}
