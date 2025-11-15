/**
 * Rate limiting utility for API routes
 * Uses in-memory storage (for production, consider Redis or database)
 * 
 * TO ENABLE REDIS:
 * 1. Install: npm install @upstash/redis (or npm install ioredis)
 * 2. Set REDIS_URL in .env (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for Upstash)
 * 3. Uncomment the Redis implementation below
 * 4. Comment out the in-memory implementation
 * 5. Update API routes to use 'await checkRateLimit(...)' instead of 'checkRateLimit(...)'
 */

// ============================================================================
// REDIS IMPLEMENTATION (COMMENTED OUT - READY TO ENABLE)
// ============================================================================
// 
// Uncomment the following code and install @upstash/redis to use Redis:
// npm install @upstash/redis
//
// For Upstash (serverless Redis - recommended, free tier available):
// 1. Sign up at https://upstash.com
// 2. Create a Redis database
// 3. Add to .env:
//    UPSTASH_REDIS_REST_URL=your_rest_url
//    UPSTASH_REDIS_REST_TOKEN=your_rest_token
// 4. Install: npm install @upstash/redis
//
// For self-hosted Redis or Redis Cloud:
// 1. Install: npm install ioredis
// 2. Add to .env: REDIS_URL=redis://localhost:6379 (or your Redis URL)
//
// import { Redis } from '@upstash/redis';
// 
// // Initialize Redis client (Upstash - uses REST API)
// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL!,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
// });
//
// // Alternative: For ioredis (self-hosted or Redis Cloud - uses native protocol)
// // import Redis from 'ioredis';
// // const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
//
// // Simple implementation using INCR with EXPIRE (works with both Upstash and ioredis):
// export async function checkRateLimit(
//   identifier: string,
//   maxRequests: number,
//   windowMs: number
// ): Promise<RateLimitResult> {
//   const key = `rate_limit:${identifier}`;
//   const ttlSeconds = Math.ceil(windowMs / 1000);
//   const now = Date.now();
//   
//   try {
//     // Increment and get count (creates key with value 1 if doesn't exist)
//     const count = await redis.incr(key);
//     
//     // Set expiration on first request (only sets if key doesn't have TTL)
//     // This ensures the key expires after the time window
//     if (count === 1) {
//       await redis.expire(key, ttlSeconds);
//     }
//     
//     const resetTime = now + windowMs;
//     
//     // Check if limit exceeded
//     if (count > maxRequests) {
//       // Get remaining TTL for accurate reset time
//       const ttl = await redis.ttl(key);
//       const secondsUntilReset = ttl > 0 ? ttl : ttlSeconds;
//       
//       return {
//         allowed: false,
//         remaining: 0,
//         resetTime: now + (secondsUntilReset * 1000),
//         error: `Rate limit exceeded. Please try again in ${secondsUntilReset} second${secondsUntilReset !== 1 ? 's' : ''}.`,
//       };
//     }
//     
//     return {
//       allowed: true,
//       remaining: maxRequests - count,
//       resetTime,
//     };
//   } catch (error) {
//     console.error('Redis rate limit error:', error);
//     // Fallback: allow request if Redis fails (fail open)
//     // Or change to fail closed: return { allowed: false, error: 'Rate limit service unavailable' }
//     return {
//       allowed: true,
//       remaining: maxRequests - 1,
//       resetTime: now + windowMs,
//     };
//   }
// }
//
// ============================================================================
// IN-MEMORY IMPLEMENTATION (CURRENTLY ACTIVE)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, use Redis or a database
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., userId)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult (or Promise<RateLimitResult> if using Redis)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  // NOTE: If using Redis, change return type to Promise<RateLimitResult>
  // and add 'async' keyword, then update all call sites to use 'await'
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  // If no entry or window has expired, create new entry
  if (!entry || entry.resetTime < now) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    const secondsUntilReset = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      error: `Rate limit exceeded. Please try again in ${secondsUntilReset} second${secondsUntilReset !== 1 ? 's' : ''}.`,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limit configuration for comments
 */
export const COMMENT_RATE_LIMIT = {
  maxRequests: 10, // Maximum 10 comments
  windowMs: 60 * 1000, // Per 60 seconds (1 minute)
};

