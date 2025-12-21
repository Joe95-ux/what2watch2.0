import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/playlists/:id/public', // Public playlist sharing pages (e.g., /playlists/[id]/public)
  '/lists/:id', // Public list sharing pages (e.g., /lists/[id])
  '/api/webhooks(.*)',
  '/api/movies(.*)', // Public movie data endpoints
  '/api/tv(.*)', // Public TV data endpoints
  '/api/genres(.*)', // Public genre endpoints
  '/api/playlists(.*)', // Playlist API endpoints (handles auth internally)
  '/api/lists(.*)', // List API endpoints (handles auth internally)
  '/api/analytics/playlist-events', // Allow unauthenticated visit tracking
  '/api/analytics/list-events', // Allow unauthenticated visit tracking
  '/api/users/:userId/profile', // Public user profile endpoint
  '/api/users/:userId/forum-stats', // Public forum stats endpoint
]);

// Routes that require auth but have special handling
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes except public ones
  // Note: clerkMiddleware automatically initializes auth context for all matched routes
  // This allows auth() to work in API routes even if they're public
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