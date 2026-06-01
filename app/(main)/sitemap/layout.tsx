import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Sitemap",
  description: "Browse all public pages on What2Watch — movies, TV, lists, forum posts, and more.",
  path: "/sitemap",
});

export default function SitemapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
