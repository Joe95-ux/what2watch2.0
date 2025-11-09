import type { Metadata } from "next";
import { Inter } from "next/font/google";
import RootProviders from "@/components/providers/root-providers";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "What2Watch - Discover Your Next Favorite Watch",
  description: "A movie and tv show watch guide like no other. Find, organize, and share your favorite content with personalized recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/sign-in"
      appearance={{
        elements: {
          formButtonPrimary:
            "bg-primary hover:bg-primary/90 text-sm !shadow-none",
        },
      }}
    >
    <html lang="en" style={{ height: '100%' }}>
      <body
        className={`${inter.variable} font-sans antialiased h-full`}
      >
        <Toaster richColors position="bottom-right" />
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
    </ClerkProvider>
  );
}
