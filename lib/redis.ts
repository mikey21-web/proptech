import Redis from 'ioredis';

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('REDIS_URL not set — Redis features disabled');
    return null;
  }

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 200, 2000);
      },
    });

    client.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    return client;
  } catch {
    console.warn('Failed to create Redis client');
    return null;
  }
}

export const redis = createRedisClient();
