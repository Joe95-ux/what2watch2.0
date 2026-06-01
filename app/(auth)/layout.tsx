import type { Metadata } from "next";
import Logo from "@/components/Logo";
import React, { ReactNode } from "react";
import { noIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = noIndexMetadata;

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <Logo />
      {children}
    </div>
  );
}

export default Layout;
