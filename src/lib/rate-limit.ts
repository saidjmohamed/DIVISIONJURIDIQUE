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

/**
 * Lazy-initialized Redis client — only created on first use.
 * This prevents build-time crashes when env vars are missing.
 */
let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

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
  const redis = getRedis();

  // If Redis is not configured, allow all requests (fail-open)
  if (!redis) {
    return { limited: false, remaining: limit, resetIn: window };
  }

  const redisKey = `ratelimit:${key}:${identifier}`;

  try {
    // Use atomic INCR + EXPIRE NX to prevent permanent rate-limit keys
    // If the server crashes between INCR and EXPIRE, the key would persist forever.
    // Using a pipeline ensures both commands run together.
    const [incrResult, expireResult] = await redis
      .pipeline()
      .incr(redisKey)
      .expire(redisKey, window, 'NX') // Only set TTL if no TTL exists
      .exec() as [number, number | null];

    const current = incrResult;
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
