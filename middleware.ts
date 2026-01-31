import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/links/(.*)', // Link-in-bio pages (e.g. /links/username) are public
  '/playlists/(.*)/public',
  '/lists/(.*)',
  '/api/webhooks(.*)',
  '/api/links/(.*)', // Public API for link page data (optional, page is server-rendered)
  '/api/movies(.*)', // Public movie data endpoints
  '/api/tv(.*)', // Public TV data endpoints
  '/api/genres(.*)', // Public genre endpoints
  '/api/playlists(.*)', // Playlist API endpoints (handles auth internally)
  '/api/lists(.*)', // List API endpoints (handles auth internally)
  '/api/analytics/playlist-events', // Allow unauthenticated visit tracking
  '/api/analytics/list-events', // Allow unauthenticated visit tracking
  '/api/analytics/page-views', // Allow unauthenticated page view tracking
  '/api/users/(.*)/profile',
  '/api/users/(.*)/forum-stats',
]);


export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};