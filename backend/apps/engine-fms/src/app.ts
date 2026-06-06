import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { performReadinessCheck } from './services/health.service';
import accountRoutes from './routes/accounts.routes';
import deviceRoutes from './routes/devices.routes';
import driverRoutes from './routes/drivers.routes';
import tripRoutes from './routes/trips.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import fuelRoutes from './routes/fuel.routes';
import geofenceRoutes from './routes/geofences.routes';
import analyticsRoutes from './routes/analytics.routes';
import alertRoutes from './routes/alerts.routes';
import payrollRoutes from './routes/payroll.routes';
import inspectionRoutes from './routes/inspections.routes';
import adminRoutes from './routes/admin.routes';

export interface CreateAppOptions {
  corsOrigin: string;
  redisUrl: string;
}

export function createApp({ corsOrigin, redisUrl }: CreateAppOptions) {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    const requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', requestId);
    (req as express.Request & { requestId: string }).requestId = requestId;
    next();
  });

  app.use((req, _res, next) => {
    const rid = (req as express.Request & { requestId?: string }).requestId ?? '-';
    logger.info('request', { requestId: rid, method: req.method, path: req.path });
    next();
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'engine-fms', timestamp: new Date().toISOString() });
  });

  app.get('/ready', async (_req, res) => {
    const readiness = await performReadinessCheck(redisUrl);
    res.status(readiness.status === 'healthy' ? 200 : 503).json(readiness);
  });

  app.use('/api/auth', authLimiter);
  app.use('/api', apiLimiter);

  app.use('/api', accountRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/drivers', driverRoutes);
  app.use('/api/trips', tripRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/fuel', fuelRoutes);
  app.use('/api/geofences', geofenceRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/payroll', payrollRoutes);
  app.use('/api/inspections', inspectionRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const rid = (req as express.Request & { requestId?: string }).requestId ?? '-';
    logger.error('unhandled_error', { requestId: rid, error: err.message, stack: err.stack });
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error', requestId: rid });
  });

  return app;
}
