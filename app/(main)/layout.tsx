"use client";

import Navbar from "@/components/navbar/navbar";
import Footer from "@/components/footer";
import { usePathname } from "next/navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard" || pathname?.startsWith("/dashboard/");
  const isForum = pathname === "/forum" || pathname?.startsWith("/forum/");
  const isYouTubeChannelDetail =
    !!pathname?.startsWith("/youtube-channel/") && !pathname.startsWith("/youtube-channel/lists");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!isDashboard && !isForum && !isYouTubeChannelDetail && <Footer />}
    </div>
  );
}

