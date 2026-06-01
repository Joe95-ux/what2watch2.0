import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Public lists",
  description: "Explore community and editorial movie & TV lists on What2Watch.",
  path: "/lists",
});

export default function ListsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
