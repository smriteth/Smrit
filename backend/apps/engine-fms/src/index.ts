import 'dotenv/config';
import { env } from './config/env';
import { logger } from './utils/logger';
import { TraccarService } from './services/traccar.service';
import { createApp } from './app';
import { setTraccarOsmAndEndpoint, setTraccarServiceInstance } from './runtime';

// Last-resort process guards so a stray rejection/exception cannot silently wedge or
// crash the API. The container (restart: unless-stopped) restarts on a fatal exception.
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason: reason instanceof Error ? reason.message : String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

const traccarServiceInstance = new TraccarService(
  env.TRACCAR_URL,
  env.TRACCAR_ADMIN_EMAIL,
  env.TRACCAR_ADMIN_PASSWORD,
);

setTraccarServiceInstance(traccarServiceInstance);
setTraccarOsmAndEndpoint(env.TRACCAR_OSMAND_ENDPOINT);

const app = createApp({
  corsOrigin: env.CORS_ORIGIN,
  redisUrl: env.REDIS_URL,
});

const port = env.PORT;
app.listen(port, () => {
  logger.info('engine-fms started', { port, traccar: env.TRACCAR_URL, env: env.NODE_ENV });
});

export { TraccarService };
