import { SignIn } from "@clerk/nextjs";
import { headers } from "next/headers";
 
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  // Get redirect URL from query params first, then check referer header, then default to /browse
  const params = await searchParams;
  const headersList = await headers();
  const referer = headersList.get("referer");
  
  // Extract path from referer if it's from our domain
  let redirectUrl = params?.redirect_url;
  if (!redirectUrl && referer) {
    try {
      const refererUrl = new URL(referer);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      
      // Only use referer if it's from the same origin (check if referer contains our domain)
      if (appUrl && referer.includes(new URL(appUrl).hostname)) {
        redirectUrl = refererUrl.pathname + refererUrl.search;
      } else if (!appUrl) {
        // If no app URL is set, use the pathname anyway (likely same origin in development)
        redirectUrl = refererUrl.pathname + refererUrl.search;
      }
    } catch {
      // Invalid URL, ignore
    }
  }
  
  return <SignIn afterSignInUrl={redirectUrl || "/browse"} />;
}