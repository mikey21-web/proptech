import { redis } from './redis';

export class RateLimiter {
  constructor(private namespace: string) {}

  private getKey(identifier: string, name: string): string {
    return `ratelimit:${this.namespace}:${identifier}:${name}`;
  }

  async checkLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    if (!redis) return true; // Allow if Redis not available

    const key = this.getKey(identifier, 'count');
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    return current <= limit;
  }

  async getRemainingAttempts(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<number> {
    if (!redis) return limit;

    const key = this.getKey(identifier, 'count');
    const current = await redis.get(key);
    const currentCount = parseInt(current || '0', 10);

    return Math.max(0, limit - currentCount);
  }

  async reset(identifier: string): Promise<void> {
    if (!redis) return;

    const key = this.getKey(identifier, 'count');
    await redis.del(key);
  }
}
