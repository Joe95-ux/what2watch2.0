"use client";

import { ThemeProvider } from "next-themes";
import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import NextTopLoader from "nextjs-toploader";
import { AvatarProvider } from "@/contexts/avatar-context";

function RootProviders({ children }: { children: ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({}));
  return (
    <QueryClientProvider client={queryClient}>
      <AvatarProvider>
        <NextTopLoader showSpinner={false} color="#CB3837" />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </AvatarProvider>
    </QueryClientProvider>
  );
}

export default RootProviders;
