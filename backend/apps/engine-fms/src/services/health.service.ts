import { prisma } from '@smrit/shared-db';
import { getTraccarServiceInstance } from '../runtime';
import { checkRedisReady } from './redis.service';

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Readiness check timed out after ${ms}ms`)), ms);
  });
}

async function checkDatabaseReady(timeoutMs = 3000): Promise<boolean> {
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout(timeoutMs)]);
    return true;
  } catch {
    return false;
  }
}

async function checkTraccarReady(timeoutMs = 3000): Promise<boolean> {
  try {
    const service = getTraccarServiceInstance();
    await Promise.race([service.getDevices(), timeout(timeoutMs)]);
    return true;
  } catch {
    return false;
  }
}

export interface ReadinessStatus {
  status: 'healthy' | 'degraded';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    traccar: 'up' | 'down';
  };
}

export async function performReadinessCheck(redisUrl: string): Promise<ReadinessStatus> {
  const [database, redis, traccar] = await Promise.all([
    checkDatabaseReady(),
    checkRedisReady(redisUrl),
    checkTraccarReady(),
  ]);

  return {
    status: database && redis && traccar ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: database ? 'up' : 'down',
      redis: redis ? 'up' : 'down',
      traccar: traccar ? 'up' : 'down',
    },
  };
}
