import { Inter } from "next/font/google";
import { rootLayoutMetadata } from "@/lib/seo/metadata";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import RootProviders from "@/components/providers/root-providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const metadata = rootLayoutMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/browse"
      afterSignInUrl="/browse"
      appearance={{
        baseTheme: dark,
        elements: {
          formButtonPrimary:
            "bg-primary hover:bg-primary/90 text-sm !shadow-none",
        },
      }}
    >
      <html
        lang="en"
        style={{ height: "100%" }}
        data-primary-color="emerald"
        suppressHydrationWarning
      >
        <body
          className={`${inter.variable} font-sans antialiased h-full`}
        >
          <Toaster richColors position="bottom-right" />
          <RootProviders>{children}</RootProviders>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
