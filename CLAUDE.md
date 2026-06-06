# SMRIT — Claude Code Instructions

## What This Project Is
SMRIT is an Ethiopian fleet management system. Traccar (open source GPS platform) runs as a 
hidden backend. All user-facing surfaces are SMRIT branded. Government clients — no Traccar 
branding anywhere.

## Monorepo Structure
- backend/apps/engine-fms — Node.js + Express API (port 3016)
- backend/packages/shared-db — Prisma schema for smrit_fms database only
- frontend — React + Vite dashboard
- mobile/smrit-driver — Flutter driver app
- Infrastructure: docker-compose.yml + traccar/conf/traccar.xml

## Critical Rules

### Never violate these:
1. NEVER write directly to traccar_gps database from Prisma. Use Traccar REST API only.
2. NEVER expose Traccar credentials, URL, or device IDs to any client response.
3. NEVER add services that aren't in the architecture (no Kafka, no GraphQL, no separate auth service).
4. NEVER use mock data in production code — all data comes from real API endpoints.
5. The smrit_fms Prisma schema is locked. Do not add fields without reviewing SMRIT_DOCUMENTATION.md.

### Always do this:
1. Wrap all TraccarService calls in try-catch. Traccar unavailability must not crash the API.
2. Use ULID for all IDs (not UUID, not auto-increment).
3. All monetary amounts in ETB (Ethiopian Birr) stored as Decimal(12,2).
4. GPS speed from Traccar is in knots. Convert to km/h by multiplying by 1.852.
5. Timezone: Africa/Addis_Ababa everywhere.
6. All new routes must use the existing auth middleware (requireUserAuth or requireDriverAuth).

## Database
- Two databases on same PostgreSQL instance: traccar_gps (Traccar's) and smrit_fms (ours)
- Prisma manages smrit_fms only. Connection string: DATABASE_URL env var.
- Run migrations: pnpm --filter shared-db exec prisma migrate dev

## Running Locally
```bash
# Start all infrastructure
docker compose up -d postgres redis traccar

# Start API
cd backend && pnpm install && pnpm dev

# Start dashboard
cd frontend && npm install && npm run dev

# Run Flutter app
cd mobile/smrit-driver && flutter pub get && flutter run
```

## Adding a New API Endpoint
1. Add route to appropriate file in backend/apps/engine-fms/src/routes/
2. Add Zod validation schema for request body
3. Use requireUserAuth or requireDriverAuth middleware
4. Add the route to API CONTRACT section of SMRIT_DOCUMENTATION.md
5. Test with curl before wiring to frontend

## When in Doubt
Read SMRIT_DOCUMENTATION.md. It is the single source of truth.
Do not invent architecture. Do not add dependencies not listed in package.json files.
Build what is specified. If a requirement is unclear, implement the simpler interpretation.
