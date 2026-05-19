/** Build sign-in URL that returns the user to the current page (preserves ?party=, ?room=, etc.). */
export function buildSignInHref(returnPath: string): string {
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  return `/sign-in?redirect_url=${encodeURIComponent(path)}`;
}
