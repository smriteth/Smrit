# SMRIT Fleet Management System

SMRIT is a white-labeled fleet management system for the Ethiopian market. It provides fleet tracking, driver management, trip lifecycle management, earnings calculation, geofence support, and a mobile driver app on top of Traccar.

## Stack

- Backend: Node.js + Express + Prisma + PostgreSQL + Redis
- Dashboard: React + Vite + TypeScript
- Driver app: Flutter
- Infrastructure: Docker Compose + nginx + Traccar

## Launch Flow

1. Create a production `.env` from `.env.production.example` and replace every placeholder with production values.
2. Run the production preflight and render the secret-backed runtime configs:
   ```bash
   npm run launch:preflight
   npm run render:configs
   ```
3. Build the dashboard with the production API URL:
   ```bash
   cd frontend
   npm install
   VITE_API_URL=https://<your-domain>/api npm run build
   cd ..
   ```
4. Install and build the backend:
   ```bash
   cd backend
   pnpm install --frozen-lockfile
   pnpm build
   cd ..
   ```
5. Start Postgres and Redis, then apply production migrations:
   ```bash
   docker compose up -d postgres redis
   npm run db:migrate:deploy
   ```
6. Start the complete stack:
   ```bash
   docker compose up -d --build
   ```

## Production Rules

- Do not commit rendered files under `postgres/generated/` or `traccar/conf/generated/`.
- Use `TRACCAR_DB_PASSWORD`, `JWT_SECRET`, `REDIS_PASSWORD`, and production URLs from environment configuration.
- Production dashboard builds must set `VITE_API_URL` to an HTTPS endpoint.
- Production mobile builds must set `API_BASE_URL` and `GPS_BASE_URL` to HTTPS endpoints.
- Backend traffic should flow through nginx; the backend container is internal only.
- GPS traffic should flow through nginx at `/gps/`; Traccar is not exposed on the host.

## Key URLs

- Dashboard: `https://<your-domain>/`
- API: `https://<your-domain>/api/`
- GPS/OsmAnd: `https://<your-domain>/gps/`
- Backend liveness: `GET /health`
- Backend readiness: `GET /ready`

## Smoke Test

After the stack is up:

```bash
curl https://<your-domain>/health
curl https://<your-domain>/ready
```

Then verify the dashboard login, truck creation, driver creation, trip start/completion, and GPS ingestion flow.

## Scripts

- `npm run render:configs` - generate the ignored runtime config files from `.env`
- `npm run launch:preflight` - reject unsafe production `.env` values before deployment
- `npm run db:migrate:deploy` - apply Prisma migrations in production mode
- `npm run test:e2e` - run Playwright tests
- `npm run test:mobile` - run Flutter tests for the driver app

## Repository Layout

- `backend/` - API, shared DB package, Prisma schema, and backend Dockerfile
- `frontend/` - dashboard app
- `mobile/smrit-driver/` - Flutter driver app
- `postgres/` - Postgres bootstrap templates
- `traccar/conf/` - Traccar config templates
- `nginx/` - reverse proxy config
- `tests/` - smoke, security, and e2e tests

## Documentation

- `PRODUCTION_SIGNOFF.md` - required production gate before real fleet rollout
- `QUICKSTART.md`, `Status.md`, `CLAUDE.md`, and `Smrit_documentation.md` are development or historical notes, not production runbooks.

## Support

If something is unclear, treat the current README, `PRODUCTION_SIGNOFF.md`, Docker Compose file, and committed launch checks as the source of truth. Keep production secrets out of Git.
