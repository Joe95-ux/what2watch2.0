import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Search movies & TV",
  description: "Search movies and TV shows and filter by genre, provider, and more.",
  path: "/search",
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
