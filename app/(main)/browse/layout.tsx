import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Browse movies & TV",
  description:
    "Discover movies and TV shows, see where to stream them, and explore personalized picks on What2Watch.",
  path: "/browse",
});

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
