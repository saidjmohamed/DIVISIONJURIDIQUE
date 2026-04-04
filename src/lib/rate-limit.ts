/**
 * نظام حماية معدل الطلبات باستخدام Upstash Redis
 * Rate Limiter — protects API routes from abuse
 * 
 * Usage:
 *   import { rateLimit } from '@/lib/rate-limit';
 *   const limited = await rateLimit({ key: 'ai-chat', limit: 20, window: 60 });
 *   if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface RateLimitOptions {
  /** Unique identifier for the rate limit category (e.g., 'ai-chat', 'petition-check') */
  key: string;
  /** Identifier for the client (usually IP address) */
  identifier?: string;
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  window: number;
}

interface RateLimitResult {
  /** Whether the request is rate limited */
  limited: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Time in seconds until the rate limit resets */
  resetIn: number;
}

export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, identifier = 'anonymous', limit, window } = options;
  const redisKey = `ratelimit:${key}:${identifier}`;
  
  try {
    // Use Redis INCR + EXPIRE for atomic rate limiting
    const current = await redis.incr(redisKey);
    
    if (current === 1) {
      // First request — set expiration
      await redis.expire(redisKey, window);
    }
    
    const ttl = await redis.ttl(redisKey);
    const remaining = Math.max(0, limit - current);
    
    return {
      limited: current > limit,
      remaining,
      resetIn: ttl > 0 ? ttl : window,
    };
  } catch {
    // If Redis fails, allow the request (fail-open for availability)
    return {
      limited: false,
      remaining: limit,
      resetIn: window,
    };
  }
}

/**
 * Get client IP from Next.js request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}
