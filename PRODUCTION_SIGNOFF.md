# SMRIT Production Sign-Off Gate

SMRIT is not considered production-ready for government, corporate, or fleet-owner rollout until every gate below has passed on a staging VPS that mirrors production.

## Required Gates

- Git: all launch code is committed and pushed to `main`.
- Secrets: no `.env`, rendered Traccar config, rendered Postgres config, private keys, or production passwords are committed.
- Runtime config: `npm run render:configs` succeeds from production `.env`.
- Database: `npm run db:migrate:deploy` succeeds against `smrit_fms`; production must not use `prisma migrate dev`, `db push`, or schema push.
- Docker: `docker compose config` succeeds and `docker compose up -d --build` starts Postgres, Redis, Traccar, engine-fms, and nginx.
- Network exposure: only nginx publishes host ports 80 and 443; backend and Traccar are internal services.
- HTTPS: nginx serves the dashboard and API through TLS; HTTP redirects to HTTPS.
- Health: `GET https://<domain>/health` returns 200 and `GET https://<domain>/ready` returns 200.
- API security: production rejects wildcard CORS, localhost production URLs, weak JWT secrets, missing Redis/Postgres/Traccar secrets, and non-HTTPS public endpoints.
- Frontend: dashboard build fails without a production HTTPS `VITE_API_URL`.
- Mobile: release builds require HTTPS `API_BASE_URL` and `GPS_BASE_URL`.
- GPS: driver GPS posts go through `https://<domain>/gps/`; Traccar protocol ports are not published directly.
- Backup: backup and restore drill succeeds for both `smrit_fms` and `traccar_gps`.
- Rollback: previous image/config redeploy is tested before onboarding real fleets.

## Client Rollout Rule

Do not onboard live fleets until staging has passed every gate above with production-style domains, TLS certificates, production-strength secrets, migrations, backups, rollback, and a signed smoke-test record.

## Historical Docs

`QUICKSTART.md`, `Status.md`, `CLAUDE.md`, and `Smrit_documentation.md` contain development and historical implementation notes. They are not production runbooks. For production launch, use this file, `README.md`, `docker-compose.yml`, `.env.example`, and the committed runtime templates.
