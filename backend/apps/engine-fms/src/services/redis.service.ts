import Redis from 'ioredis';

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Redis readiness check timed out after ${ms}ms`)), ms);
  });
}

export async function checkRedisReady(redisUrl: string, timeoutMs = 3000): Promise<boolean> {
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: timeoutMs,
    maxRetriesPerRequest: 0,
  });

  try {
    await Promise.race([client.connect(), timeout(timeoutMs)]);
    await Promise.race([client.ping(), timeout(timeoutMs)]);
    return true;
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}
