/**
 * Simple in-memory rate limiter for authentication endpoints
 * Default: 5 attempts per 15 minutes per IP
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  maxAttempts?: number
  windowMs?: number
}

const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp

  // For development: fallback to request URL
  return new URL(req.url).hostname || 'unknown'
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = {}
): { allowed: boolean; remaining: number; resetTime: number } {
  const { maxAttempts, windowMs } = { ...DEFAULT_CONFIG, ...config }
  const now = Date.now()

  let entry = store.get(key)

  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs }
    store.set(key, entry)
  }

  entry.count++

  const remaining = Math.max(0, maxAttempts - entry.count)
  const allowed = entry.count <= maxAttempts

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  }
}

/**
 * Reset rate limit store (for testing)
 */
export function _resetStore(): void {
  store.clear()
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanup(): void {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
}

// Clean up every hour
if (typeof globalThis !== 'undefined') {
  setInterval(cleanup, 60 * 60 * 1000)
}
