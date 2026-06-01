import { buildPageMetadata } from "@/lib/seo/metadata";
import LandingPage from "@/components/landing/landing-page";

export const metadata = buildPageMetadata({
  title: "Discover your next favorite watch",
  description:
    "Discover, organize, and share movies and TV shows with recommendations and community-curated lists on What2Watch.",
  path: "/",
});

export default function HomePage() {
  return <LandingPage />;
}
