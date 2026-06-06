import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './utils/logger';
import { TraccarService } from './services/traccar.service';
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

// Single TraccarService instance — admin auth, shared across all routes
export const traccarServiceInstance = new TraccarService(
  env.TRACCAR_URL,
  env.TRACCAR_ADMIN_EMAIL,
  env.TRACCAR_ADMIN_PASSWORD,
);

export { TraccarService };

const app = express();

// Security headers
app.use(helmet());

// CORS
if (env.NODE_ENV === 'production' && env.CORS_ORIGIN === '*') {
  logger.warn('CORS_ORIGIN is "*" in production — set it to the dashboard origin');
}
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Attach request ID to every request
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  (req as express.Request & { requestId: string }).requestId = requestId;
  next();
});

// Request logging
app.use((req, res, next) => {
  const rid = (req as express.Request & { requestId?: string }).requestId ?? '-';
  logger.info('request', { requestId: rid, method: req.method, path: req.path });
  next();
});

// Auth rate limiter — strict
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// Health check — always works, even if DB is down
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'engine-fms', timestamp: new Date().toISOString() });
});

// Apply rate limiters
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Routes
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

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler — sanitized response to the client, full detail to the structured log.
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const rid = (req as express.Request & { requestId?: string }).requestId ?? '-';
  logger.error('unhandled_error', { requestId: rid, error: err.message, stack: err.stack });
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error', requestId: rid });
});

// Last-resort process guards so a stray rejection/exception cannot silently wedge or
// crash the API. The container (restart: unless-stopped) restarts on a fatal exception.
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason: reason instanceof Error ? reason.message : String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

const port = env.PORT;
app.listen(port, () => {
  logger.info('engine-fms started', { port, traccar: env.TRACCAR_URL, env: env.NODE_ENV });
});
