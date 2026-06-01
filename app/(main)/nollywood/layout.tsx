import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Nollywood",
  description: "Discover Nollywood movies and series — trailers, picks, and where to watch.",
  path: "/nollywood",
});

export default function NollywoodLayout({ children }: { children: React.ReactNode }) {
  return children;
}
