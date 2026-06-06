# SMRIT — Complete System Documentation
## The Canonical Base for Autonomous Implementation

**Version:** 1.0.0  
**Date:** June 2, 2026  
**Status:** Foundation Document — Do Not Modify Without Full Review  
**Purpose:** Single source of truth given to a coding agent for full autonomous implementation

---

## TABLE OF CONTENTS

1. [What SMRIT Is — The Canonical Definition](#1-what-smrit-is)
2. [System Architecture](#2-system-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Infrastructure Setup — Docker & Traccar](#4-infrastructure-setup)
5. [Database Schema — smrit_fms](#5-database-schema)
6. [Backend — engine-fms API](#6-backend-engine-fms-api)
7. [API Contract — Complete Specification](#7-api-contract)
8. [React Dashboard — Specification & Stitch Prompt](#8-react-dashboard)
9. [Flutter Driver App — Specification & Stitch Prompt](#9-flutter-driver-app)
10. [Authentication Architecture](#10-authentication-architecture)
11. [GPS Data Flow](#11-gps-data-flow)
12. [Environment Variables](#12-environment-variables)
13. [CLAUDE.md — Agent Instructions](#13-claudemd)
14. [Implementation Order — Day by Day](#14-implementation-order)
15. [Critical Constraints & Rules](#15-critical-constraints-and-rules)

---

## 1. WHAT SMRIT IS

### Canonical Definition

SMRIT is a white-labeled fleet management system (FMS) built for the Ethiopian market. It is designed for large government and enterprise fleet clients or any fleet owners that want to manage their fleets. The system allows fleet operators to track vehicles in real time, manage drivers, record trips, calculate driver earnings, and generate compliance reports — all under the SMRIT brand.

SMRIT is NOT a GPS tracking platform. Traccar is the GPS tracking platform, running entirely as a hidden backend service. SMRIT is the business logic, the user experience, and the brand that sits on top of Traccar.

### What "White-Labeled" Means in This Context

Traccar is an open-source GPS platform (Apache 2.0). SMRIT uses Traccar exclusively as a data store and GPS ingestion engine. No user — not a driver, not a fleet manager, not a government auditor — ever sees Traccar, logs into Traccar, or knows Traccar exists. The system is presented entirely as "SMRIT Fleet Management System" with SMRIT branding throughout.

### The Value SMRIT Delivers

- A government ministry can manage 500+ vehicles, see them live on a map, know their status, and generate audit-ready reports
- A fleet manager can onboard drivers in minutes, assign trucks, and monitor performance
- A driver opens a branded mobile app, taps Start Trip, drives, taps Stop Trip, and immediately sees what they earned
- a fleet owner can manage his fleets and drivers
- All GPS data stays on-premises in Ethiopia — no data leaves to third-party cloud platforms

### Who Uses SMRIT

| Role | Interface | What They Do |
|------|-----------|--------------|
| Government Admin / Fleet Owner | React web dashboard | Onboard drivers, assign trucks, view live map, see trip history, export reports |
| Fleet Manager | React web dashboard | Day-to-day operations, driver management, trip oversight |
| Fleet owner | fleet owner | manage their fleets and drivers in real time |
| Driver | Flutter mobile app (SMRIT branded) | Login, start trip, GPS tracks silently, stop trip, see earnings |
| System Admin | Server CLI + dashboard | Deploy, configure, maintain infrastructure |

### SMRIT Brand Identity

all brand identity is in /branding in this folder directory

---

## 2. SYSTEM ARCHITECTURE

### Guiding Principle

Compact over clever. Every service does one job. No microservices, no message queues, no event sourcing in MVP. One Node.js process handles all fleet API logic. Traccar handles all GPS ingestion. PostgreSQL holds everything.

### Service Map

```
SMRIT React Dashboard (Vite + React, port 5173 dev / Nginx prod)
    ↓ REST API calls
engine-fms (Node.js + Express, port 3016)
    ↓ Admin REST calls (hidden)         ↓ Prisma ORM
Traccar Server (port 8082, internal)    smrit_fms database (PostgreSQL)
    ↓ Stores GPS data
traccar_gps database (PostgreSQL)

SMRIT Flutter Driver App
    ↓ REST API calls
engine-fms (port 3016) ← login, trip start/stop, earnings
    ↓ Direct GPS POST (OsmAnd protocol, no auth)
Traccar OsmAnd endpoint (port 8082/?) ← raw GPS positions

PostgreSQL 16 (port 5432) — two databases: traccar_gps + smrit_fms
Redis (port 6379) — position cache, session cache
Nginx (port 80/443) — reverse proxy, SSL termination
```

### Port Map

| Service | Internal Port | Exposed |
|---------|--------------|---------|
| PostgreSQL | 5432 | Internal only |
| Redis | 6379 | Internal only |
| Traccar | 8082 | Internal only (never public) |
| Traccar GPS protocols | 5000–5150 | Public (for hardware GPS devices) |
| engine-fms | 3016 | Via Nginx at /api |
| React Dashboard | 5173 (dev) | Via Nginx at / |

### Two-Database Rule

**This rule is non-negotiable.** Traccar owns `traccar_gps`. SMRIT owns `smrit_fms`. Your Prisma schema only touches `smrit_fms`. You never write directly to `traccar_gps`. You read from Traccar exclusively through the Traccar REST API (`http://traccar:8082/api`). The only exception is the analytics engine reading raw position counts from `traccar_gps` for performance reporting — and even then it's a read-only connection.

Why: Traccar upgrades change its database schema. If you couple to it directly, an upgrade breaks your system. The REST API is a stable contract.

---

## 3. REPOSITORY STRUCTURE

```
smrit/
├──Brandind (includes all branding files)
├── SMRIT_DOCUMENTATION.md          ← this file
├── docker-compose.yml              ← single compose file, all services
├── .env                            ← environment variables (never commit)
├── .env.example                    ← committed template
├── nginx/
│   └── nginx.conf
├── traccar/
│   └── conf/
│       └── traccar.xml
├── backend/
│   ├── package.json                ← pnpm workspace root
│   ├── pnpm-workspace.yaml
│   ├── tsconfig.base.json
│   ├── packages/
│   │   └── shared-db/
│   │       ├── package.json
│   │       ├── prisma/
│   │       │   └── schema.prisma
│   │       └── src/
│   │           └── index.ts        ← exports prisma client
│   └── apps/
│       └── engine-fms/
│           ├── package.json
│           ├── tsconfig.json
│           ├── .env
│           └── src/
│               ├── index.ts
│               ├── services/
│               │   ├── traccar.service.ts
│               │   └── trip.service.ts
│               ├── middleware/
│               │   └── auth.middleware.ts
│               └── routes/
│                   ├── accounts.routes.ts
│                   ├── devices.routes.ts
│                   ├── drivers.routes.ts
│                   └── trips.routes.ts
├── frontend/
│   └── smrit-dashboard/
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── api/
│           │   └── client.ts       ← axios instance + React Query setup
│           ├── pages/
│           │   ├── Login.tsx
│           │   ├── Overview.tsx
│           │   ├── Trucks.tsx
│           │   ├── Drivers.tsx
│           │   └── Trips.tsx
│           └── components/
│               ├── FleetMap.tsx
│               ├── TruckTable.tsx
│               └── TripList.tsx
└── mobile/
    └── smrit-driver/
        ├── pubspec.yaml
        └── lib/
            ├── main.dart
            ├── services/
            │   ├── gps_service.dart
            │   └── fms_api_service.dart
            ├── providers/
            │   └── auth_provider.dart
            └── screens/
                ├── login_screen.dart
                ├── home_screen.dart
                ├── active_trip_screen.dart
                └── trip_summary_screen.dart
```

---

## 4. INFRASTRUCTURE SETUP

### 4.1 Prerequisites

```bash
# Server requirements
- Ubuntu 22.04 LTS (or equivalent)
- Docker 24+ and Docker Compose v2
- 4GB RAM minimum, 8GB recommended for 500+ vehicles
- 50GB disk minimum

# Local dev requirements
- Node.js 20 LTS
- pnpm 8+
- Flutter 3.19+
- Docker Desktop
```

### 4.2 docker-compose.yml — Complete File

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: smrit_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: smrit_fms
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - smrit_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: smrit_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - smrit_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  traccar:
    image: traccar/traccar:6.4-alpine
    container_name: smrit_traccar
    restart: unless-stopped
    ports:
      - "5000-5150:5000-5150"
      - "5000-5150:5000-5150/udp"
    volumes:
      - ./traccar/conf/traccar.xml:/opt/traccar/conf/traccar.xml:ro
      - traccar_logs:/opt/traccar/logs
      - traccar_data:/opt/traccar/data
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - smrit_network

  engine-fms:
    build:
      context: ./backend
      dockerfile: apps/engine-fms/Dockerfile
    container_name: smrit_engine_fms
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3016
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/smrit_fms
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      TRACCAR_URL: http://traccar:8082
      TRACCAR_ADMIN_EMAIL: ${TRACCAR_ADMIN_EMAIL}
      TRACCAR_ADMIN_PASSWORD: ${TRACCAR_ADMIN_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - smrit_network

  nginx:
    image: nginx:alpine
    container_name: smrit_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/smrit-dashboard/dist:/usr/share/nginx/html:ro
    depends_on:
      - engine-fms
    networks:
      - smrit_network

volumes:
  postgres_data:
  redis_data:
  traccar_logs:
  traccar_data:

networks:
  smrit_network:
    driver: bridge
```

### 4.3 postgres/init.sql

This file runs once on first container start to create the Traccar database alongside the default smrit_fms database.

```sql
-- Create Traccar database (smrit_fms already created by POSTGRES_DB env var)
CREATE DATABASE traccar_gps;

-- Create Traccar user with access only to traccar_gps
CREATE USER traccar_user WITH PASSWORD 'traccar_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE traccar_gps TO traccar_user;

\c traccar_gps
GRANT ALL ON SCHEMA public TO traccar_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO traccar_user;

-- Grant read-only access to smrit analytics (optional, for analytics engine later)
\c smrit_fms
GRANT CONNECT ON DATABASE traccar_gps TO ${POSTGRES_USER};
```

### 4.4 traccar/conf/traccar.xml — Complete File

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <!-- Database -->
  <entry key="database.driver">org.postgresql.Driver</entry>
  <entry key="database.url">jdbc:postgresql://postgres:5432/traccar_gps</entry>
  <entry key="database.user">traccar_user</entry>
  <entry key="database.password">traccar_secure_password_here</entry>

  <!-- Server -->
  <entry key="server.port">8082</entry>
  <entry key="server.address">0.0.0.0</entry>

  <!-- Timezone — Ethiopia -->
  <entry key="server.timezone">Africa/Addis_Ababa</entry>

  <!-- Session -->
  <entry key="server.sessionTimeout">1800000</entry>

  <!-- GPS position filtering — critical for production -->
  <!-- Without this, parked trucks spam millions of identical positions -->
  <entry key="filter.enable">true</entry>
  <entry key="filter.distance">50</entry>
  <entry key="filter.maxSpeed">250</entry>
  <entry key="filter.duplicate">true</entry>
  <entry key="filter.zero">true</entry>

  <!-- Logging -->
  <entry key="logger.level">info</entry>
  <entry key="logger.file">./logs/tracker-server.log</entry>
  <entry key="logger.rotate">true</entry>

  <!-- OsmAnd protocol — what Flutter app uses for GPS posting -->
  <entry key="osmand.port">5055</entry>
</configuration>
```

### 4.5 nginx/nginx.conf

```nginx
events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  upstream engine_fms {
    server engine-fms:3016;
  }

  server {
    listen 80;
    server_name _;

    # React dashboard
    location / {
      root /usr/share/nginx/html;
      index index.html;
      try_files $uri $uri/ /index.html;
    }

    # FMS API
    location /api/ {
      proxy_pass http://engine_fms/api/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Traccar is intentionally NOT proxied — internal only
  }
}
```

### 4.6 First Boot Verification

After `docker compose up -d`, run these in order to verify everything works:

```bash
# 1. All containers running
docker compose ps

# 2. PostgreSQL healthy
docker exec smrit_postgres pg_isready -U smrit_user

# 3. Traccar started (takes ~30 seconds)
curl -s http://localhost:8082/api/server | python3 -m json.tool

# 4. CRITICAL smoke test — register a test device in Traccar via the API
# First get an admin session
curl -c /tmp/traccar_cookies.txt \
  -X POST http://localhost:8082/api/session \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@smrit.et&password=YOUR_ADMIN_PASSWORD"

# Create test device
curl -b /tmp/traccar_cookies.txt \
  -X POST http://localhost:8082/api/devices \
  -H "Content-Type: application/json" \
  -d '{"name":"TEST_TRUCK_001","uniqueId":"TEST_DEVICE_001"}'

# 5. Send test GPS position via OsmAnd protocol
curl "http://localhost:5055/?id=TEST_DEVICE_001&lat=9.0320&lon=38.7469&speed=0&bearing=0&altitude=2300&accuracy=5&batt=100"

# 6. Verify position was stored (check Traccar UI or query API)
curl -b /tmp/traccar_cookies.txt \
  "http://localhost:8082/api/positions?deviceId=1" | python3 -m json.tool

# If you see the position in the response, the GPS pipeline is working.
# This is the most important verification step.
```

---

## 5. DATABASE SCHEMA

### 5.1 backend/packages/shared-db/prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────────
// SMRIT FMS Models — smrit_fms database only
// Never touch traccar_gps database from here
// ─────────────────────────────────────────────────

model FmsAccount {
  id              String      @id @db.VarChar(26)
  name            String
  contactEmail    String      @map("contact_email")
  contactPhone    String      @map("contact_phone")
  traccarUserId   Int?        @map("traccar_user_id")
  isActive        Boolean     @default(true) @map("is_active")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  trucks          FmsTruck[]
  drivers         FmsDriver[]
  trips           FmsTrip[]

  @@map("fms_accounts")
}

model FmsUser {
  id              String      @id @db.VarChar(26)
  accountId       String      @db.VarChar(26) @map("account_id")
  email           String      @unique
  passwordHash    String      @map("password_hash")
  role            String      @default("FLEET_MANAGER")
  // roles: FLEET_OWNER, FLEET_MANAGER, OPS_ADMIN
  isActive        Boolean     @default(true) @map("is_active")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  @@map("fms_users")
}

model FmsTruck {
  id                String      @id @db.VarChar(26)
  accountId         String      @db.VarChar(26) @map("account_id")
  traccarDeviceId   Int?        @map("traccar_device_id")
  traccarUniqueId   String      @unique @map("traccar_unique_id")
  licensePlate      String      @unique @map("license_plate")
  model             String
  year              Int
  capacityKg        Int         @map("capacity_kg")
  status            String      @default("ACTIVE")
  // status: ACTIVE, MAINTENANCE, RETIRED

  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  account           FmsAccount  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  activeDriver      FmsDriver?  @relation("ActiveTruck")
  trips             FmsTrip[]

  @@index([accountId])
  @@index([traccarDeviceId])
  @@map("fms_trucks")
}

model FmsDriver {
  id                String      @id @db.VarChar(26)
  accountId         String      @db.VarChar(26) @map("account_id")
  name              String
  phone             String      @unique
  passwordHash      String      @map("password_hash")
  licenseNumber     String      @unique @map("license_number")
  licenseExpiry     DateTime    @map("license_expiry")
  assignedTruckId   String?     @unique @db.VarChar(26) @map("assigned_truck_id")
  status            String      @default("ACTIVE")
  // status: ACTIVE, INACTIVE, SUSPENDED
  totalTrips        Int         @default(0) @map("total_trips")
  totalEarningsEtb  Decimal     @default(0) @db.Decimal(12, 2) @map("total_earnings_etb")

  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  account           FmsAccount  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  assignedTruck     FmsTruck?   @relation("ActiveTruck", fields: [assignedTruckId], references: [id])
  trips             FmsTrip[]
  earnings          FmsDriverEarning[]

  @@index([accountId])
  @@map("fms_drivers")
}

model FmsTrip {
  id                String      @id @db.VarChar(26)
  accountId         String      @db.VarChar(26) @map("account_id")
  truckId           String      @db.VarChar(26) @map("truck_id")
  driverId          String      @db.VarChar(26) @map("driver_id")
  traccarDeviceId   Int         @map("traccar_device_id")

  originName        String      @map("origin_name")
  originLat         Decimal     @db.Decimal(9, 6) @map("origin_lat")
  originLng         Decimal     @db.Decimal(9, 6) @map("origin_lng")
  destinationName   String      @map("destination_name")
  destLat           Decimal     @db.Decimal(9, 6) @map("dest_lat")
  destLng           Decimal     @db.Decimal(9, 6) @map("dest_lng")

  status            String      @default("STARTED")
  // status: STARTED, IN_TRANSIT, COMPLETED, FAILED

  plannedDistanceKm Decimal?    @db.Decimal(8, 2) @map("planned_distance_km")
  actualDistanceKm  Decimal?    @db.Decimal(8, 2) @map("actual_distance_km")
  plannedArrival    DateTime?   @map("planned_arrival")
  actualArrival     DateTime?   @map("actual_arrival")

  maxSpeedKmh       Int?        @map("max_speed_kmh")
  avgSpeedKmh       Int?        @map("avg_speed_kmh")

  baseRatePerKm     Decimal     @db.Decimal(8, 2) @map("base_rate_per_km")
  distanceChargesEtb Decimal    @default(0) @db.Decimal(12, 2) @map("distance_charges_etb")
  bonusEtb          Decimal     @default(0) @db.Decimal(10, 2) @map("bonus_etb")
  penaltyEtb        Decimal     @default(0) @db.Decimal(10, 2) @map("penalty_etb")
  totalEarningsEtb  Decimal     @default(0) @db.Decimal(12, 2) @map("total_earnings_etb")

  startedAt         DateTime    @default(now()) @map("started_at")
  completedAt       DateTime?   @map("completed_at")
  createdAt         DateTime    @default(now()) @map("created_at")

  account           FmsAccount  @relation(fields: [accountId], references: [id])
  truck             FmsTruck    @relation(fields: [truckId], references: [id])
  driver            FmsDriver   @relation(fields: [driverId], references: [id])
  earning           FmsDriverEarning?

  @@index([accountId])
  @@index([driverId])
  @@index([status])
  @@index([startedAt])
  @@map("fms_trips")
}

model FmsDriverEarning {
  id              String      @id @db.VarChar(26)
  driverId        String      @db.VarChar(26) @map("driver_id")
  tripId          String      @unique @db.VarChar(26) @map("trip_id")

  distanceKm      Decimal     @db.Decimal(8, 2) @map("distance_km")
  ratePerKm       Decimal     @db.Decimal(8, 2) @map("rate_per_km")
  baseEarning     Decimal     @db.Decimal(12, 2) @map("base_earning")
  bonus           Decimal     @default(0) @db.Decimal(10, 2)
  penalty         Decimal     @default(0) @db.Decimal(10, 2)
  totalEarning    Decimal     @db.Decimal(12, 2) @map("total_earning")
  status          String      @default("PENDING")
  // status: PENDING, APPROVED, PAID

  createdAt       DateTime    @default(now()) @map("created_at")

  driver          FmsDriver   @relation(fields: [driverId], references: [id])
  trip            FmsTrip     @relation(fields: [tripId], references: [id])

  @@index([driverId])
  @@index([status])
  @@map("fms_driver_earnings")
}
```

### 5.2 Seed Data

File: `backend/packages/shared-db/prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('smrit2026', 10);

  const account = await prisma.fmsAccount.upsert({
    where: { id: '01HSMRIT_DEMO_ACCOUNT00' },
    update: {},
    create: {
      id: ulid(),
      name: 'Ministry of Transport — Pilot Fleet',
      contactEmail: 'fleet@mot.gov.et',
      contactPhone: '+251911000001',
    },
  });

  // Seed user
  await prisma.fmsUser.upsert({
    where: { email: 'admin@smrit.et' },
    update: {},
    create: {
      id: ulid(),
      accountId: account.id,
      email: 'admin@smrit.et',
      passwordHash,
      role: 'FLEET_OWNER',
    },
  });

  console.log('Seed complete. Login: admin@smrit.et / smrit2026');
}

main().finally(() => prisma.$disconnect());
```

---

## 6. BACKEND — engine-fms API

### 6.1 Package Setup

**backend/package.json** (workspace root):
```json
{
  "name": "smrit-backend",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter engine-fms dev",
    "build": "pnpm -r build",
    "db:generate": "pnpm --filter shared-db exec prisma generate",
    "db:migrate": "pnpm --filter shared-db exec prisma migrate dev",
    "db:seed": "pnpm --filter shared-db exec prisma db seed"
  }
}
```

**backend/pnpm-workspace.yaml**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**backend/packages/shared-db/package.json**:
```json
{
  "name": "@smrit/shared-db",
  "version": "1.0.0",
  "main": "src/index.ts",
  "scripts": {
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0"
  },
  "devDependencies": {
    "prisma": "^5.14.0",
    "ulid": "^2.3.0",
    "bcrypt": "^5.1.1"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**backend/packages/shared-db/src/index.ts**:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
```

**backend/apps/engine-fms/package.json**:
```json
{
  "name": "engine-fms",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@smrit/shared-db": "workspace:*",
    "express": "^4.19.0",
    "axios": "^1.7.0",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "zod": "^3.23.0",
    "ulid": "^2.3.0",
    "dotenv": "^16.4.0",
    "ioredis": "^5.4.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.11.0",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.12.0"
  }
}
```

### 6.2 TraccarService

**backend/apps/engine-fms/src/services/traccar.service.ts**:

```typescript
import axios, { AxiosInstance } from 'axios';

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string; // 'online' | 'offline' | 'unknown'
  lastUpdate: string;
  positionId: number;
  attributes: Record<string, unknown>;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;   // knots — convert to km/h by multiplying by 1.852
  course: number;
  accuracy: number;
  fixTime: string;
  deviceTime: string;
  attributes: Record<string, unknown>;
}

export class TraccarService {
  private client: AxiosInstance;

  constructor(
    private readonly traccarUrl: string,
    adminEmail: string,
    adminPassword: string,
  ) {
    const token = Buffer.from(`${adminEmail}:${adminPassword}`).toString('base64');
    this.client = axios.create({
      baseURL: `${traccarUrl.replace(/\/$/, '')}/api`,
      headers: { Authorization: `Basic ${token}` },
      timeout: 10000,
    });
  }

  async createDevice(name: string, uniqueId: string): Promise<TraccarDevice> {
    const res = await this.client.post('/devices', { name, uniqueId });
    return res.data;
  }

  async getDevices(): Promise<TraccarDevice[]> {
    const res = await this.client.get('/devices');
    return res.data;
  }

  async getDevice(deviceId: number): Promise<TraccarDevice> {
    const res = await this.client.get(`/devices/${deviceId}`);
    return res.data;
  }

  async deleteDevice(deviceId: number): Promise<void> {
    await this.client.delete(`/devices/${deviceId}`);
  }

  async getPositions(deviceId: number, from: Date, to: Date): Promise<TraccarPosition[]> {
    const res = await this.client.get('/positions', {
      params: {
        deviceId,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    });
    return res.data;
  }

  async getLatestPositions(): Promise<TraccarPosition[]> {
    // Returns latest position for ALL devices
    const res = await this.client.get('/positions');
    return res.data;
  }

  // Calculate distance between two lat/lng points using Haversine formula
  // Returns distance in kilometers
  static haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Calculate total distance from array of positions
  static totalDistanceKm(positions: TraccarPosition[]): number {
    let total = 0;
    for (let i = 1; i < positions.length; i++) {
      total += TraccarService.haversineKm(
        positions[i - 1].latitude,
        positions[i - 1].longitude,
        positions[i].latitude,
        positions[i].longitude,
      );
    }
    return Math.round(total * 10) / 10;
  }
}
```

### 6.3 Auth Middleware

**backend/apps/engine-fms/src/middleware/auth.middleware.ts**:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  accountId: string;
  role: string;
  type: 'user';
}

export interface DriverAuthPayload {
  driverId: string;
  accountId: string;
  truckId: string;
  traccarDeviceId: number;
  traccarUniqueId: string;
  type: 'driver';
}

export interface AuthRequest extends Request {
  auth?: AuthPayload | DriverAuthPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload | DriverAuthPayload;
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireUserAuth(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.type !== 'user') {
      return res.status(403).json({ error: 'User authentication required' });
    }
    next();
  });
}

export function requireDriverAuth(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.type !== 'driver') {
      return res.status(403).json({ error: 'Driver authentication required' });
    }
    next();
  });
}
```

### 6.4 Routes — accounts

**backend/apps/engine-fms/src/routes/accounts.routes.ts**:

```typescript
import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/login — dashboard user login
router.post('/auth/login', async (req, res: Response) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string(),
  });
  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });

  const user = await prisma.fmsUser.findUnique({ where: { email: body.data.email } });
  if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user.id, accountId: user.accountId, role: user.role, type: 'user' },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' },
  );

  res.json({ token, userId: user.id, accountId: user.accountId, role: user.role });
});

// POST /api/auth/driver/login — driver mobile app login
router.post('/auth/driver/login', async (req, res: Response) => {
  const schema = z.object({
    phone: z.string(),
    password: z.string(),
  });
  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });

  const driver = await prisma.fmsDriver.findUnique({
    where: { phone: body.data.phone },
    include: { assignedTruck: true },
  });
  if (!driver || driver.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Invalid credentials or account suspended' });
  }

  const valid = await bcrypt.compare(body.data.password, driver.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  if (!driver.assignedTruck) {
    return res.status(403).json({ error: 'No truck assigned to this driver' });
  }

  const token = jwt.sign(
    {
      driverId: driver.id,
      accountId: driver.accountId,
      truckId: driver.assignedTruck.id,
      traccarDeviceId: driver.assignedTruck.traccarDeviceId,
      traccarUniqueId: driver.assignedTruck.traccarUniqueId,
      type: 'driver',
    },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' },
  );

  res.json({
    token,
    driver: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
    },
    truck: {
      id: driver.assignedTruck.id,
      name: driver.assignedTruck.model,
      licensePlate: driver.assignedTruck.licensePlate,
      traccarUniqueId: driver.assignedTruck.traccarUniqueId,
    },
  });
});

export default router;
```

### 6.5 Routes — drivers

**backend/apps/engine-fms/src/routes/drivers.routes.ts**:

```typescript
import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { traccarService } from '../services/traccar.service';

const router = Router();

// GET /api/drivers — list all drivers for account
router.get('/', requireUserAuth, async (req: AuthRequest, res: Response) => {
  const auth = req.auth as { accountId: string };
  const drivers = await prisma.fmsDriver.findMany({
    where: { accountId: auth.accountId },
    include: { assignedTruck: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(drivers);
});

// POST /api/drivers — create driver and register them in Traccar
router.post('/', requireUserAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(2),
    phone: z.string(),
    password: z.string().min(6),
    licenseNumber: z.string(),
    licenseExpiry: z.string(),
    assignedTruckId: z.string().optional(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };
  const passwordHash = await bcrypt.hash(body.data.password, 10);

  const driver = await prisma.fmsDriver.create({
    data: {
      id: ulid(),
      accountId: auth.accountId,
      name: body.data.name,
      phone: body.data.phone,
      passwordHash,
      licenseNumber: body.data.licenseNumber,
      licenseExpiry: new Date(body.data.licenseExpiry),
      assignedTruckId: body.data.assignedTruckId ?? null,
    },
  });

  res.status(201).json(driver);
});

// PATCH /api/drivers/:id — update driver (assign truck, status change, etc.)
router.patch('/:id', requireUserAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    assignedTruckId: z.string().nullable().optional(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const driver = await prisma.fmsDriver.update({
    where: { id: req.params.id },
    data: body.data,
  });

  res.json(driver);
});

export default router;
```

### 6.6 Routes — devices (trucks)

**backend/apps/engine-fms/src/routes/devices.routes.ts**:

```typescript
import { Router, Response } from 'express';
import { z } from 'zod';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { traccarServiceInstance } from '../index';

const router = Router();

// GET /api/devices — list trucks with latest positions
router.get('/', requireUserAuth, async (req: AuthRequest, res: Response) => {
  const auth = req.auth as { accountId: string };

  const trucks = await prisma.fmsTruck.findMany({
    where: { accountId: auth.accountId },
    include: { activeDriver: true },
  });

  // Get latest positions from Traccar for all devices
  let latestPositions: Record<number, { lat: number; lng: number; speed: number; fixTime: string }> = {};
  try {
    const positions = await traccarServiceInstance.getLatestPositions();
    for (const pos of positions) {
      latestPositions[pos.deviceId] = {
        lat: pos.latitude,
        lng: pos.longitude,
        speed: Math.round(pos.speed * 1.852), // knots to km/h
        fixTime: pos.fixTime,
      };
    }
  } catch {
    // Traccar may be temporarily unavailable — return trucks without positions
  }

  const result = trucks.map((truck) => ({
    id: truck.id,
    licensePlate: truck.licensePlate,
    model: truck.model,
    status: truck.status,
    driver: truck.activeDriver ? { id: truck.activeDriver.id, name: truck.activeDriver.name } : null,
    position: truck.traccarDeviceId ? latestPositions[truck.traccarDeviceId] ?? null : null,
    traccarUniqueId: truck.traccarUniqueId,
  }));

  res.json(result);
});

// POST /api/devices — register a truck (creates Traccar device)
router.post('/', requireUserAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    licensePlate: z.string(),
    model: z.string(),
    year: z.number().int(),
    capacityKg: z.number().int(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };
  const traccarUniqueId = `SMRIT_${ulid()}`;

  // Register in Traccar first
  let traccarDeviceId: number | null = null;
  try {
    const traccarDevice = await traccarServiceInstance.createDevice(
      body.data.licensePlate,
      traccarUniqueId,
    );
    traccarDeviceId = traccarDevice.id;
  } catch (err) {
    return res.status(500).json({ error: 'Failed to register GPS device' });
  }

  const truck = await prisma.fmsTruck.create({
    data: {
      id: ulid(),
      accountId: auth.accountId,
      traccarDeviceId,
      traccarUniqueId,
      licensePlate: body.data.licensePlate,
      model: body.data.model,
      year: body.data.year,
      capacityKg: body.data.capacityKg,
    },
  });

  res.status(201).json(truck);
});

// GET /api/devices/:id/history — position history for a truck
router.get('/:id/history', requireUserAuth, async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to query params required (ISO 8601)' });

  const truck = await prisma.fmsTruck.findUnique({ where: { id: req.params.id } });
  if (!truck?.traccarDeviceId) return res.status(404).json({ error: 'Truck not found or no GPS device' });

  const positions = await traccarServiceInstance.getPositions(
    truck.traccarDeviceId,
    new Date(from as string),
    new Date(to as string),
  );

  res.json({
    truckId: truck.id,
    licensePlate: truck.licensePlate,
    positions: positions.map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
      speed: Math.round(p.speed * 1.852),
      fixTime: p.fixTime,
    })),
  });
});

export default router;
```

### 6.7 Routes — trips

**backend/apps/engine-fms/src/routes/trips.routes.ts**:

```typescript
import { Router, Response } from 'express';
import { z } from 'zod';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth, requireDriverAuth, DriverAuthPayload } from '../middleware/auth.middleware';
import { traccarServiceInstance, TraccarService } from '../index';

const router = Router();

// POST /api/trips/start — driver starts a trip
router.post('/start', requireDriverAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    originName: z.string(),
    originLat: z.number(),
    originLng: z.number(),
    destinationName: z.string(),
    destLat: z.number(),
    destLng: z.number(),
    baseRatePerKm: z.number().optional().default(15),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as DriverAuthPayload;

  // Check no active trip already running
  const activeTrip = await prisma.fmsTrip.findFirst({
    where: { driverId: auth.driverId, status: { in: ['STARTED', 'IN_TRANSIT'] } },
  });
  if (activeTrip) {
    return res.status(409).json({ error: 'Driver already has an active trip', tripId: activeTrip.id });
  }

  const trip = await prisma.fmsTrip.create({
    data: {
      id: ulid(),
      accountId: auth.accountId,
      truckId: auth.truckId,
      driverId: auth.driverId,
      traccarDeviceId: auth.traccarDeviceId,
      originName: body.data.originName,
      originLat: body.data.originLat,
      originLng: body.data.originLng,
      destinationName: body.data.destinationName,
      destLat: body.data.destLat,
      destLng: body.data.destLng,
      baseRatePerKm: body.data.baseRatePerKm,
      status: 'STARTED',
    },
  });

  res.status(201).json({
    tripId: trip.id,
    message: 'Trip started. GPS tracking active.',
    traccarUniqueId: auth.traccarUniqueId,
    osmandEndpoint: `${process.env.TRACCAR_OSMAND_ENDPOINT}`,
  });
});

// POST /api/trips/:id/complete — driver completes trip
router.post('/:id/complete', requireDriverAuth, async (req: AuthRequest, res: Response) => {
  const auth = req.auth as DriverAuthPayload;

  const trip = await prisma.fmsTrip.findUnique({ where: { id: req.params.id } });
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.driverId !== auth.driverId) return res.status(403).json({ error: 'Not your trip' });
  if (trip.status === 'COMPLETED') return res.status(409).json({ error: 'Trip already completed' });

  // Fetch GPS positions from Traccar for this trip's duration
  const positions = await traccarServiceInstance.getPositions(
    trip.traccarDeviceId,
    trip.startedAt,
    new Date(),
  );

  const actualDistanceKm = TraccarService.totalDistanceKm(positions);

  // Speed stats
  const speeds = positions.map((p) => Math.round(p.speed * 1.852));
  const maxSpeedKmh = speeds.length ? Math.max(...speeds) : 0;
  const avgSpeedKmh = speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;

  // Earnings
  const distanceChargesEtb = actualDistanceKm * Number(trip.baseRatePerKm);
  const now = new Date();
  let bonusEtb = 0;
  let penaltyEtb = 0;
  if (trip.plannedArrival) {
    if (now <= trip.plannedArrival) {
      bonusEtb = Math.round(distanceChargesEtb * 0.05 * 100) / 100;
    } else {
      const lateHours = (now.getTime() - trip.plannedArrival.getTime()) / 3_600_000;
      penaltyEtb = Math.round(distanceChargesEtb * 0.02 * lateHours * 100) / 100;
    }
  }
  const totalEarningsEtb = distanceChargesEtb + bonusEtb - penaltyEtb;

  // Update trip + create earning record atomically
  const [updatedTrip] = await prisma.$transaction([
    prisma.fmsTrip.update({
      where: { id: trip.id },
      data: {
        status: 'COMPLETED',
        actualDistanceKm,
        actualArrival: now,
        maxSpeedKmh,
        avgSpeedKmh,
        distanceChargesEtb,
        bonusEtb,
        penaltyEtb,
        totalEarningsEtb,
        completedAt: now,
      },
    }),
    prisma.fmsDriverEarning.create({
      data: {
        id: ulid(),
        driverId: trip.driverId,
        tripId: trip.id,
        distanceKm: actualDistanceKm,
        ratePerKm: trip.baseRatePerKm,
        baseEarning: distanceChargesEtb,
        bonus: bonusEtb,
        penalty: penaltyEtb,
        totalEarning: totalEarningsEtb,
        status: 'PENDING',
      },
    }),
    prisma.fmsDriver.update({
      where: { id: trip.driverId },
      data: {
        totalTrips: { increment: 1 },
        totalEarningsEtb: { increment: totalEarningsEtb },
      },
    }),
  ]);

  res.json({
    tripId: trip.id,
    distanceKm: actualDistanceKm,
    durationMinutes: Math.round((now.getTime() - trip.startedAt.getTime()) / 60_000),
    earnings: {
      base: Math.round(distanceChargesEtb * 100) / 100,
      bonus: bonusEtb,
      penalty: penaltyEtb,
      total: Math.round(totalEarningsEtb * 100) / 100,
      currency: 'ETB',
    },
  });
});

// GET /api/trips — list trips for account (dashboard use)
router.get('/', requireUserAuth, async (req: AuthRequest, res: Response) => {
  const auth = req.auth as { accountId: string };
  const { status, driverId, limit = '20', offset = '0' } = req.query;

  const trips = await prisma.fmsTrip.findMany({
    where: {
      accountId: auth.accountId,
      ...(status ? { status: status as string } : {}),
      ...(driverId ? { driverId: driverId as string } : {}),
    },
    include: {
      driver: { select: { id: true, name: true, phone: true } },
      truck: { select: { id: true, licensePlate: true, model: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: parseInt(limit as string),
    skip: parseInt(offset as string),
  });

  res.json(trips);
});

// GET /api/trips/active — driver's currently active trip
router.get('/active', requireDriverAuth, async (req: AuthRequest, res: Response) => {
  const auth = req.auth as DriverAuthPayload;

  const trip = await prisma.fmsTrip.findFirst({
    where: { driverId: auth.driverId, status: { in: ['STARTED', 'IN_TRANSIT'] } },
  });

  if (!trip) return res.status(404).json({ active: false });
  res.json({ active: true, trip });
});

export default router;
```

### 6.8 Main App Entry

**backend/apps/engine-fms/src/index.ts**:

```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { TraccarService } from './services/traccar.service';
import accountRoutes from './routes/accounts.routes';
import deviceRoutes from './routes/devices.routes';
import driverRoutes from './routes/drivers.routes';
import tripRoutes from './routes/trips.routes';

// Single TraccarService instance — admin auth, shared across all routes
export const traccarServiceInstance = new TraccarService(
  process.env.TRACCAR_URL!,
  process.env.TRACCAR_ADMIN_EMAIL!,
  process.env.TRACCAR_ADMIN_PASSWORD!,
);

export { TraccarService };

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check — always works, even if DB is down
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'engine-fms', timestamp: new Date().toISOString() });
});

app.use('/api', accountRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3016;
app.listen(port, () => {
  console.log(`engine-fms running on port ${port}`);
  console.log(`Traccar: ${process.env.TRACCAR_URL}`);
});
```

---

## 7. API CONTRACT

This is the complete API contract. UI builders must consume exactly these endpoints.

### Base URL

Development: `http://localhost:3016/api`
Production: `https://your-domain.com/api`

All requests requiring auth: `Authorization: Bearer <token>`

### Auth Endpoints

```
POST /auth/login
Body: { email: string, password: string }
Response: { token: string, userId: string, accountId: string, role: string }

POST /auth/driver/login
Body: { phone: string, password: string }
Response: {
  token: string,
  driver: { id, name, phone },
  truck: { id, name, licensePlate, traccarUniqueId }
}
```

### Devices (Trucks)

```
GET /devices
Auth: user JWT
Response: [{
  id: string,
  licensePlate: string,
  model: string,
  status: "ACTIVE" | "MAINTENANCE" | "RETIRED",
  driver: { id, name } | null,
  position: { lat, lng, speed, fixTime } | null
}]

POST /devices
Auth: user JWT
Body: { licensePlate, model, year, capacityKg }
Response: FmsTruck object

GET /devices/:id/history?from=ISO&to=ISO
Auth: user JWT
Response: { truckId, licensePlate, positions: [{lat, lng, speed, fixTime}] }
```

### Drivers

```
GET /drivers
Auth: user JWT
Response: FmsDriver[] with assignedTruck

POST /drivers
Auth: user JWT
Body: { name, phone, password, licenseNumber, licenseExpiry, assignedTruckId? }
Response: FmsDriver object

PATCH /drivers/:id
Auth: user JWT
Body: { name?, status?, assignedTruckId? }
Response: FmsDriver object
```

### Trips

```
POST /trips/start
Auth: driver JWT
Body: { originName, originLat, originLng, destinationName, destLat, destLng, baseRatePerKm? }
Response: { tripId, message, traccarUniqueId, osmandEndpoint }

POST /trips/:id/complete
Auth: driver JWT
Response: {
  tripId,
  distanceKm,
  durationMinutes,
  earnings: { base, bonus, penalty, total, currency: "ETB" }
}

GET /trips
Auth: user JWT
Query: ?status=COMPLETED&driverId=xxx&limit=20&offset=0
Response: FmsTrip[] with driver and truck

GET /trips/active
Auth: driver JWT
Response: { active: boolean, trip?: FmsTrip }
```

### GPS Posting (Flutter → Traccar directly, no auth, no FMS API)

```
GET http://TRACCAR_HOST:5055/?id=TRACCAR_UNIQUE_ID&lat=9.032&lon=38.746&speed=60&bearing=90&altitude=2300&accuracy=5&batt=85

This is the OsmAnd protocol. The Flutter app calls this directly.
TRACCAR_HOST is the server IP/domain.
Port 5055 is the OsmAnd port defined in traccar.xml.
id = traccarUniqueId returned at driver login.
Speed is in km/h for OsmAnd.
```

---

## 8. REACT DASHBOARD

### 8.1 Technical Setup

```bash
# Create project
npm create vite@latest smrit-dashboard -- --template react-ts
cd smrit-dashboard
npm install

# Core dependencies
npm install @tanstack/react-query axios
npm install react-router-dom
npm install leaflet react-leaflet
npm install @types/leaflet
npm install recharts
npm install date-fns

# Dev
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3016',
    },
  },
});
```

**src/api/client.ts**:
```typescript
import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smrit_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('smrit_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});
```

### 8.2 Pages Required

| Page | Route | Data Sources | Key Features |
|------|-------|-------------|--------------|
| Login | /login | POST /auth/login | Email + password form, stores token |
| Overview | / | GET /devices, GET /trips | Live map (Leaflet), active trucks count, recent trips table |
| Trucks | /trucks | GET /devices, POST /devices | Truck list table, add truck form |
| Drivers | /drivers | GET /drivers, POST /drivers, PATCH /drivers/:id | Driver list, add driver, assign truck |
| Trips | /trips | GET /trips | Trip history table, filter by status/driver |

### 8.3 FleetMap Component Specification

The map is the centerpiece of the dashboard. It must:
- Use Leaflet with OpenStreetMap tiles (free, no API key)
- Center on Addis Ababa by default: `[9.0320, 38.7469]`, zoom 12
- Show a marker for each truck that has a position
- Marker color: green = ACTIVE + moving, yellow = ACTIVE + stopped, red = MAINTENANCE
- Clicking a marker shows a popup: truck license plate, driver name, speed, last seen
- Auto-refresh positions every 30 seconds using React Query's `refetchInterval`

```typescript
// FleetMap.tsx — core logic
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function FleetMap() {
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices').then(r => r.data),
    refetchInterval: 30_000,
  });

  return (
    <MapContainer center={[9.032, 38.7469]} zoom={12} style={{ height: '500px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {devices?.filter(d => d.position).map(device => (
        <Marker key={device.id} position={[device.position.lat, device.position.lng]}>
          <Popup>
            <strong>{device.licensePlate}</strong><br />
            Driver: {device.driver?.name ?? 'Unassigned'}<br />
            Speed: {device.position.speed} km/h<br />
            Last seen: {new Date(device.position.fixTime).toLocaleString()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

### 8.4 Stitch Prompt for Dashboard Design

Copy this exact prompt into Stitch:

---

**STITCH PROMPT — SMRIT Dashboard:**

Design a professional government fleet management dashboard called "SMRIT Fleet Management System" with the following specifications:

Brand colors: Primary #1B4F8A (deep blue), Secondary #F5A623 (amber), Background #F8F9FA, Text #1A1A2E, Success #27AE60, Danger #E74C3C. Font: Inter.

Design these 5 screens:

**1. Login Screen**
Full-page centered card. SMRIT logo (text wordmark in #1B4F8A) at top. "Fleet Management System" subtitle in gray. Email field, password field, "Sign In" button in primary blue. Clean, governmental, professional. No decorative elements.

**2. Overview / Dashboard**
Left sidebar navigation (width 240px): logo at top, nav items: Overview, Trucks, Drivers, Trips. All in dark navy.
Main content area: 4 KPI cards in a row — Total Trucks, Active Now, Trips Today, Revenue Today. Below that: a map placeholder (just show a labeled rectangle "Live Fleet Map — Leaflet"). Below map: "Recent Trips" table with columns: Driver, Truck, Origin → Destination, Distance, Earnings, Status.

**3. Trucks Page**
Same sidebar. Page header "Fleet Trucks" with a "+ Add Truck" button (primary blue). Sortable table: License Plate, Model, Year, Status (colored pill), Driver, Last Seen. Row action: View History.

**4. Drivers Page**
Same sidebar. Page header "Drivers" with "+ Add Driver" button. Table: Name, Phone, Assigned Truck, Total Trips, Total Earnings, Status. Status pill: ACTIVE (green), INACTIVE (gray), SUSPENDED (red). Clicking a row opens a slide-out panel with driver details.

**5. Add Driver Modal**
A clean modal form: Name (text), Phone (text with +251 prefix hint), Password (password field), License Number (text), License Expiry (date picker), Assign Truck (dropdown). Two buttons: Cancel and Save Driver (primary blue).

Export as React components using TypeScript, Tailwind CSS, functional components, no mock data — all data comes from props or React Query hooks.

---

### 8.5 v0 / Dyad Prompt for Dashboard

When using v0 or Dyad to generate the complete wired application:

---

**V0/DYAD PROMPT:**

Build a complete React + TypeScript + Vite fleet management dashboard called "SMRIT". 

API base URL comes from environment variable `VITE_API_URL`. All data fetching must use `@tanstack/react-query` `useQuery` hooks. No mock data, no hardcoded arrays. Auth token stored in localStorage as `smrit_token`.

Pages:
1. `/login` — POST to `/api/auth/login` with email/password, stores token, redirects to `/`
2. `/` — Overview with Leaflet map (center 9.032,38.7469) and trucks from `GET /api/devices` (refetch every 30s), plus recent trips from `GET /api/trips?limit=10`
3. `/trucks` — Table from `GET /api/devices`, form to `POST /api/devices`
4. `/drivers` — Table from `GET /api/drivers`, form to `POST /api/drivers`, PATCH to `/api/drivers/:id`
5. `/trips` — Table from `GET /api/trips` with status filter

Colors: Primary #1B4F8A, Secondary #F5A623. Use Tailwind CSS.

Protected routes — redirect to /login if no token. React Router v6 for routing.

---

---

## 9. FLUTTER DRIVER APP

### 9.1 pubspec.yaml

```yaml
name: smrit_driver
description: SMRIT Fleet Management — Driver App

version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: ">=3.10.0"

dependencies:
  flutter:
    sdk: flutter
  
  # HTTP
  dio: ^5.4.0
  
  # GPS
  geolocator: ^11.0.0
  
  # State management
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0
  
  # Background tasks
  workmanager: ^0.5.2
  
  # Storage
  flutter_secure_storage: ^9.0.0
  
  # Utils
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.0
  riverpod_generator: ^2.3.0
```

### 9.2 GPS Service

**lib/services/gps_service.dart**:

```dart
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class GpsService {
  static const _storage = FlutterSecureStorage();
  static const _updateIntervalSeconds = 30;
  
  static String? _traccarUniqueId;
  static String? _traccarOsmandEndpoint;
  static bool _isTracking = false;
  static Stream<Position>? _stream;

  /// Call this at app startup / login to configure GPS service
  static Future<void> configure({
    required String traccarUniqueId,
    required String osmandEndpoint,
  }) async {
    _traccarUniqueId = traccarUniqueId;
    _traccarOsmandEndpoint = osmandEndpoint;
    await _storage.write(key: 'traccar_unique_id', value: traccarUniqueId);
    await _storage.write(key: 'osmand_endpoint', value: osmandEndpoint);
  }

  static Future<void> startTracking() async {
    if (_isTracking) return;

    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      final result = await Geolocator.requestPermission();
      if (result == LocationPermission.denied) {
        throw Exception('Location permission denied');
      }
    }
    if (permission == LocationPermission.deniedForever) {
      throw Exception('Location permission permanently denied. Enable in settings.');
    }

    _isTracking = true;
    _stream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 20, // Minimum 20 meters movement to trigger update
      ),
    );

    _stream?.listen(_onPosition, onError: (e) {
      print('GPS stream error: $e');
    });
  }

  static Future<void> stopTracking() async {
    _isTracking = false;
    // Stream naturally closes when we stop listening
  }

  static Future<void> _onPosition(Position position) async {
    final uniqueId = _traccarUniqueId ?? await _storage.read(key: 'traccar_unique_id');
    final endpoint = _traccarOsmandEndpoint ?? await _storage.read(key: 'osmand_endpoint');
    
    if (uniqueId == null || endpoint == null) return;

    // Post to Traccar OsmAnd endpoint — no auth needed
    try {
      final dio = Dio();
      await dio.get(endpoint, queryParameters: {
        'id': uniqueId,
        'lat': position.latitude,
        'lon': position.longitude,
        'speed': position.speed * 3.6, // m/s to km/h
        'bearing': position.heading,
        'altitude': position.altitude,
        'accuracy': position.accuracy,
        'batt': 100, // Battery — static for now
      });
    } catch (e) {
      // Fail silently — retry on next position update
      print('GPS post failed (will retry): $e');
    }
  }

  static bool get isTracking => _isTracking;
}
```

### 9.3 FMS API Service

**lib/services/fms_api_service.dart**:

```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class FmsApiService {
  static const _storage = FlutterSecureStorage();
  late final Dio _dio;
  
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3016/api', // Android emulator localhost
  );

  FmsApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'smrit_driver_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  Future<Map<String, dynamic>> login(String phone, String password) async {
    final res = await _dio.post('/auth/driver/login', data: {
      'phone': phone,
      'password': password,
    });
    final data = res.data as Map<String, dynamic>;
    await _storage.write(key: 'smrit_driver_token', value: data['token']);
    return data;
  }

  Future<void> logout() async {
    await _storage.delete(key: 'smrit_driver_token');
    await _storage.delete(key: 'traccar_unique_id');
    await _storage.delete(key: 'osmand_endpoint');
  }

  Future<Map<String, dynamic>> startTrip({
    required String originName,
    required double originLat,
    required double originLng,
    required String destinationName,
    required double destLat,
    required double destLng,
  }) async {
    final res = await _dio.post('/trips/start', data: {
      'originName': originName,
      'originLat': originLat,
      'originLng': originLng,
      'destinationName': destinationName,
      'destLat': destLat,
      'destLng': destLng,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> completeTrip(String tripId) async {
    final res = await _dio.post('/trips/$tripId/complete');
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>?> getActiveTrip() async {
    try {
      final res = await _dio.get('/trips/active');
      final data = res.data as Map<String, dynamic>;
      if (data['active'] == true) return data['trip'];
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }
}
```

### 9.4 Screens

**lib/screens/login_screen.dart**:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/fms_api_service.dart';
import '../services/gps_service.dart';
import 'home_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _login() async {
    setState(() { _loading = true; _error = null; });
    try {
      final api = FmsApiService();
      final data = await api.login(_phoneController.text.trim(), _passwordController.text);
      
      // Configure GPS service with credentials from login response
      final truck = data['truck'] as Map<String, dynamic>;
      await GpsService.configure(
        traccarUniqueId: truck['traccarUniqueId'],
        osmandEndpoint: 'http://YOUR_SERVER_IP:5055/',
      );

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => HomeScreen(loginData: data)),
        );
      }
    } catch (e) {
      setState(() { _error = 'Invalid phone number or password'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // SMRIT Logo
              const Text('SMRIT', style: TextStyle(
                fontSize: 40, fontWeight: FontWeight.bold,
                color: Color(0xFF1B4F8A), letterSpacing: 4,
              )),
              const SizedBox(height: 4),
              const Text('Fleet Management System', style: TextStyle(
                color: Color(0xFF6B7280), fontSize: 14,
              )),
              const SizedBox(height: 48),

              // Phone field
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  hintText: '+251 9XX XXX XXX',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone),
                ),
              ),
              const SizedBox(height: 16),

              // Password field
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lock),
                ),
              ),
              
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: Color(0xFFE74C3C))),
              ],
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _login,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1B4F8A),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: _loading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Sign In', style: TextStyle(
                        color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600,
                      )),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

**lib/screens/active_trip_screen.dart**:

```dart
import 'package:flutter/material.dart';
import 'dart:async';
import '../services/fms_api_service.dart';
import '../services/gps_service.dart';
import 'trip_summary_screen.dart';

class ActiveTripScreen extends StatefulWidget {
  final String tripId;
  final String destinationName;

  const ActiveTripScreen({
    super.key, required this.tripId, required this.destinationName,
  });

  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  late Timer _timer;
  int _elapsedSeconds = 0;
  bool _stopping = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() { _elapsedSeconds++; });
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String get _elapsed {
    final h = _elapsedSeconds ~/ 3600;
    final m = (_elapsedSeconds % 3600) ~/ 60;
    final s = _elapsedSeconds % 60;
    return '${h.toString().padLeft(2,'0')}:${m.toString().padLeft(2,'0')}:${s.toString().padLeft(2,'0')}';
  }

  Future<void> _stopTrip() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Stop Trip?'),
        content: const Text('Are you sure you want to end this trip?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE74C3C)),
            child: const Text('Stop Trip', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() { _stopping = true; });
    try {
      await GpsService.stopTracking();
      final api = FmsApiService();
      final result = await api.completeTrip(widget.tripId);
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => TripSummaryScreen(result: result)),
        );
      }
    } catch (e) {
      setState(() { _stopping = false; });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error completing trip. Please try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text('SMRIT', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
        backgroundColor: const Color(0xFF1B4F8A),
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Spacer(),

            // GPS Active Indicator
            Container(
              width: 120, height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF27AE60).withOpacity(0.15),
                border: Border.all(color: const Color(0xFF27AE60), width: 3),
              ),
              child: const Center(child: Icon(Icons.location_on, color: Color(0xFF27AE60), size: 60)),
            ),
            const SizedBox(height: 16),
            const Text('GPS Active', style: TextStyle(color: Color(0xFF27AE60), fontWeight: FontWeight.w600, fontSize: 16)),

            const SizedBox(height: 32),

            // Destination
            Text('→ ${widget.destinationName}',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1A1A2E)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(_elapsed, style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w300, color: Color(0xFF1B4F8A))),

            const Spacer(),

            // Stop button
            SizedBox(
              width: double.infinity, height: 60,
              child: ElevatedButton(
                onPressed: _stopping ? null : _stopTrip,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE74C3C),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _stopping
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Stop Trip', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
```

### 9.5 Stitch Prompt for Flutter App

---

**STITCH PROMPT — SMRIT Driver App:**

Design a Flutter mobile app called "SMRIT Fleet" for truck drivers. Government-grade professional look.

Brand: Primary color #1B4F8A (dark blue), Secondary #F5A623 (amber), Background #F8F9FA, Text #1A1A2E. Font: Inter or system default.

Design these 4 screens:

**1. Login Screen**
Full screen, light background. SMRIT wordmark centered top. "Fleet Management System" subtitle in gray. Phone number field (with +251 hint). Password field. "Sign In" button full width, primary blue. Professional, no decorations.

**2. Home Screen**
Top: AppBar with "SMRIT" text logo in white on #1B4F8A. Body: Driver info card (name, truck plate, truck model) in a white card with light shadow. Status section: "Ready to drive" with a green dot. Large amber "Start Trip" button at bottom. Clean whitespace, minimal, serious.

**3. Active Trip Screen**
AppBar same. Center: large green pulsing circle with location icon — communicates GPS is active. "GPS Tracking Active" text below it. Below that: destination name large and bold. Running trip timer HH:MM:SS in large light font. Bottom: large red "Stop Trip" button full width.

**4. Trip Summary Screen**
AppBar: "Trip Complete". Center: large green checkmark circle. "Trip Complete" heading. Stats cards in a grid: Distance (km), Duration (minutes), Base Earnings (ETB), Bonus (ETB), Total Earned (ETB) — the earnings number should be the biggest, in primary blue. "Done" button at bottom returns to Home.

Export as Flutter Dart code. Material 3. No mock data. All data passed via constructor parameters.

---

---

## 10. AUTHENTICATION ARCHITECTURE

### How It Works

There are two distinct auth contexts in SMRIT:

**Dashboard users** (fleet managers, admins):
- Authenticate via `POST /api/auth/login` with email + password
- Receive a JWT with `{ type: 'user', userId, accountId, role }`
- JWT stored in browser `localStorage` as `smrit_token`
- All dashboard API calls include `Authorization: Bearer <token>`
- Token expiry: 8 hours

**Drivers**:
- Authenticate via `POST /api/auth/driver/login` with phone + password
- Receive a JWT with `{ type: 'driver', driverId, accountId, truckId, traccarDeviceId, traccarUniqueId }`
- JWT stored in Flutter's `flutter_secure_storage`
- All FMS API calls include the JWT
- Token expiry: 24 hours
- The `traccarUniqueId` from login is stored locally and used by `GpsService` to post positions directly to Traccar OsmAnd — the driver JWT is NOT used for this

**Traccar admin session**:
- `engine-fms` holds one admin Basic auth credential for Traccar
- This credential is set in environment variables
- It is used server-side only — never sent to any client
- All calls to Traccar API (`http://traccar:8082/api`) go through this single admin auth

### What Drivers Never See

- Traccar credentials
- Traccar device IDs (integer)
- The `traccarUniqueId` is visible in their JWT payload but meaningless to them
- The Traccar URL/hostname
- Any Traccar branding or interface

---

## 11. GPS DATA FLOW

### The Full Path of a GPS Point

```
1. Flutter app's GpsService receives a position from the device GPS hardware

2. GpsService calls:
   GET http://SERVER:5055/?id=SMRIT_01HXXX&lat=9.032&lon=38.746&speed=60&...
   (Traccar OsmAnd protocol — port 5055, no auth, just the unique ID)

3. Traccar receives this, matches the uniqueId to a device in traccar_gps.devices,
   and writes a new row to traccar_gps.positions

4. This happens every 20–50 meters of movement (distanceFilter in Flutter)

5. When driver taps "Stop Trip":
   - Flutter calls POST /api/trips/:id/complete (with SMRIT driver JWT)
   - engine-fms calls Traccar REST API: GET /api/positions?deviceId=X&from=T1&to=T2
   - Traccar returns all positions for that device in that time window
   - engine-fms runs Haversine on the position array to get total distance
   - Calculates earnings, saves to smrit_fms, returns result to Flutter app

6. React dashboard calls GET /api/devices every 30 seconds
   - engine-fms calls Traccar: GET /api/positions (latest for all devices)
   - Returns positions to dashboard
   - Leaflet map updates markers
```

### Why GPS Posts Go Directly to Traccar (Not Through FMS API)

At 500 vehicles, each posting every 30 seconds, that is ~17 GPS posts per second hitting your API. Traccar is purpose-built for this ingestion rate. Running it through your Node.js API adds a proxy hop, memory pressure, and a failure point. Let Traccar absorb the ingestion. Your API handles business logic only.

### OsmAnd Endpoint Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | traccarUniqueId (e.g. `SMRIT_01HXXX`) |
| lat | float | Latitude (e.g. 9.032) |
| lon | float | Longitude (e.g. 38.746) |
| speed | float | Speed in km/h |
| bearing | float | Heading in degrees 0–360 |
| altitude | float | Altitude in meters |
| accuracy | float | Accuracy in meters |
| batt | int | Battery percentage (optional) |

---

## 12. ENVIRONMENT VARIABLES

### .env.example (commit this — not .env)

```env
# PostgreSQL
POSTGRES_USER=smrit_user
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=smrit_fms

# Redis
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# Traccar
TRACCAR_ADMIN_EMAIL=admin@smrit.et
TRACCAR_ADMIN_PASSWORD=CHANGE_ME_TRACCAR_PASSWORD
TRACCAR_OSMAND_ENDPOINT=http://YOUR_SERVER_IP:5055/

# JWT
JWT_SECRET=CHANGE_ME_64_CHAR_RANDOM_STRING_HERE

# App
NODE_ENV=production
PORT=3016
CORS_ORIGIN=https://your-domain.com

# React Dashboard (prefix VITE_ for Vite to expose to client)
VITE_API_URL=https://your-domain.com/api
```

### Generating Secrets

```bash
# Generate JWT secret (64 chars)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate strong passwords
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Traccar Initial Admin Setup

When Traccar first starts, it creates a default admin with email `admin@example.com` and password `admin`. You must change this immediately:

```bash
# After first boot, update admin credentials:
curl -c /tmp/cookies.txt \
  -X POST http://localhost:8082/api/session \
  -d "email=admin@example.com&password=admin"

curl -b /tmp/cookies.txt \
  -X PUT http://localhost:8082/api/users/1 \
  -H "Content-Type: application/json" \
  -d "{\"id\":1,\"name\":\"SMRIT Admin\",\"email\":\"admin@smrit.et\",\"password\":\"YOUR_NEW_PASSWORD\",\"administrator\":true}"
```

---

## 13. CLAUDE.md

This file lives at the root of the repository and instructs Claude Code on every session.

```markdown
# SMRIT — Claude Code Instructions

## What This Project Is
SMRIT is an Ethiopian fleet management system. Traccar (open source GPS platform) runs as a 
hidden backend. All user-facing surfaces are SMRIT branded. Government clients — no Traccar 
branding anywhere.

## Monorepo Structure
- backend/apps/engine-fms — Node.js + Express API (port 3016)
- backend/packages/shared-db — Prisma schema for smrit_fms database only
- frontend/smrit-dashboard — React + Vite dashboard
- mobile/smrit-driver — Flutter driver app
- Infrastructure: docker-compose.yml + traccar/conf/traccar.xml

## Critical Rules

### Never violate these:
1. NEVER write directly to traccar_gps database from Prisma. Use Traccar REST API only.
2. NEVER expose Traccar credentials, URL, or device IDs to any client response.
3. NEVER add services that aren't in the architecture (no Kafka, no GraphQL, no separate auth service).
4. NEVER use mock data in production code — all data comes from real API endpoints.
5. The smrit_fms Prisma schema is locked. Do not add fields without reviewing this document.

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
cd frontend/smrit-dashboard && npm install && npm run dev

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
```

---

## 14. IMPLEMENTATION ORDER

This is the exact sequence for a 4-day locked-in implementation. Follow it without deviation.

### Day 1 — Infrastructure and Data Foundation

**Goal by end of day: Traccar is running, database exists, GPS smoke test passes.**

```
Morning:
□ Clone/init repository with structure from Section 3
□ Write docker-compose.yml (Section 4.2)
□ Write postgres/init.sql (Section 4.3)
□ Write traccar/conf/traccar.xml (Section 4.4)
□ Write nginx/nginx.conf (Section 4.5)
□ docker compose up -d
□ Wait 30 seconds, run all verification checks from Section 4.6
□ GPS smoke test MUST pass before proceeding: curl the OsmAnd endpoint, see position in Traccar

Afternoon:
□ Set up pnpm workspace (backend/package.json, pnpm-workspace.yaml)
□ Set up shared-db package (package.json, prisma/schema.prisma from Section 5.1)
□ pnpm install
□ pnpm db:migrate (creates all tables in smrit_fms)
□ Write and run seed.ts (Section 5.2)
□ Verify: prisma studio or psql query shows seeded account and user

End of Day 1 checkpoint:
✓ docker compose ps — all 5 services healthy
✓ curl http://localhost:3016/health — but engine-fms isn't built yet, this is tomorrow
✓ GPS smoke test passed (critical — do not proceed without this)
✓ smrit_fms tables exist with seed data
```

### Day 2 — Backend API

**Goal by end of day: All API endpoints work, Postman collection validates every route.**

```
Morning:
□ Set up engine-fms package (Section 6.1)
□ Write TraccarService (Section 6.2) — test each method with console.log before wiring routes
□ Write auth middleware (Section 6.3)
□ Write accounts/auth routes (Section 6.4) — test login endpoints with curl

Afternoon:
□ Write devices routes (Section 6.6)
□ Write drivers routes (Section 6.5)
□ Write trips routes (Section 6.7)
□ Write main index.ts (Section 6.8)
□ docker compose up -d engine-fms (or run with pnpm dev)
□ Test EVERY endpoint in Section 7 with curl or Postman

End of Day 2 checkpoint:
✓ POST /api/auth/login returns a token
✓ POST /api/auth/driver/login returns token with traccarUniqueId
✓ POST /api/devices creates a truck AND registers it in Traccar
✓ POST /api/trips/start creates trip record
✓ POST /api/trips/:id/complete calculates and returns earnings
✓ GET /api/devices returns trucks with positions
```

### Day 3 — Interfaces (React + Flutter)

**Goal by end of day: Both interfaces are built and connected to the real API.**

```
Morning (React Dashboard):
□ Set up smrit-dashboard with Vite (Section 8.1)
□ Give Stitch prompt (Section 8.3) to Stitch — get design
□ Give v0/Dyad prompt (Section 8.5) to v0 — get complete wired React code
□ Copy v0 output into smrit-dashboard/src/
□ Fix any import errors, ensure VITE_API_URL is set
□ npm run dev — dashboard loads, login works against real API

Afternoon (Flutter App):
□ Set up smrit-driver Flutter project
□ Write pubspec.yaml (Section 9.1)
□ Give Stitch prompt (Section 9.5) to Stitch — get Flutter screen designs
□ Write GpsService (Section 9.2)
□ Write FmsApiService (Section 9.3)
□ Write LoginScreen and ActiveTripScreen (Section 9.4)
□ flutter run — app boots, login works against real API

End of Day 3 checkpoint:
✓ Dashboard login works with admin@smrit.et / smrit2026
✓ Dashboard shows (empty) truck list, map renders centered on Addis Ababa
✓ Flutter app login works with a test driver phone/password
✓ No mock data anywhere — everything hits real endpoints
```

### Day 4 — End-to-End Integration and Polish

**Goal by end of day: Full working demo, real phone, real GPS, real earnings.**

```
Morning (Wire everything):
□ Dashboard: truck registration form works (creates device in Traccar)
□ Dashboard: driver creation form works (creates driver, assigns truck)
□ Dashboard: map shows truck position after GPS test
□ Flutter: start trip flow complete (GPS starts, positions visible in Traccar)
□ Flutter: stop trip flow complete (earnings calculated and shown)

Afternoon (End-to-end test):
□ Create a driver via dashboard
□ Log into Flutter app with that driver's phone/password
□ Start a trip
□ Walk around with the phone (or drive) for 5+ minutes
□ Confirm: truck appears on dashboard map with correct position
□ Stop trip
□ Confirm: earnings shown in Flutter app
□ Confirm: trip appears in dashboard trip history with correct distance/earnings

Last 2 hours (Fix critical bugs only):
□ Fix bugs found in end-to-end test
□ Do NOT add new features
□ Do NOT refactor
□ Commit everything

End of Day 4 checkpoint:
✓ A real person on a real phone can start a trip, be tracked live, stop the trip, see earnings
✓ The admin dashboard shows the trip on the map and in history
✓ Everything is under SMRIT branding — no Traccar visible anywhere
```

---

## 15. CRITICAL CONSTRAINTS AND RULES

### Rules That Cannot Be Broken

**Architecture rules:**
- One `docker-compose.yml` — not one per service
- One `engine-fms` Node.js process — not multiple microservices
- Traccar is accessed only via its REST API from engine-fms — never via direct SQL
- smrit_fms database is accessed only via Prisma from engine-fms — not direct SQL from dashboard
- Traccar URL is never sent to any client (dashboard or mobile app)

**GPS rules:**
- Speed from Traccar REST API is in knots. Always multiply by 1.852 for km/h
- OsmAnd protocol posts go directly from Flutter to Traccar — not proxied through engine-fms
- The `filter.duplicate=true` in traccar.xml must not be removed — it prevents position table bloat

**Money rules:**
- All amounts in ETB (Ethiopian Birr)
- Stored as `Decimal(12,2)` in PostgreSQL — never as Float (floating point precision errors in money)
- Base rate default: 15 ETB per km (configurable via `baseRatePerKm` trip parameter)
- On-time bonus: +5% of distance charges
- Late penalty: -2% per hour late

**Security rules:**
- JWT_SECRET must be at least 64 characters and randomly generated
- Traccar admin password must be changed from default before going to production
- Traccar port 8082 must NOT be exposed publicly (no entry in docker-compose ports for 8082)
- GPS protocol ports (5000-5150) are public — needed for hardware GPS devices
- OsmAnd port 5055 is public — needed for Flutter app GPS posting

**ID rules:**
- All FMS entity IDs use ULID format (not UUID, not auto-increment integer)
- Traccar device IDs are integers assigned by Traccar — store in `traccarDeviceId` field
- `traccarUniqueId` is your string (e.g., `SMRIT_01HXXX`) — this is what identifies the device to Traccar's ingest protocols

### What Is Deliberately Out of Scope for MVP

These are NOT built in the 4-day sprint. Do not add them:

- Analytics engine (engine-analytics) — post-MVP
- PDF report generation — post-MVP
- Maintenance scheduling — post-MVP
- Push notifications — post-MVP
- Geofencing alerts — post-MVP
- Driver performance ratings — post-MVP
- Multi-tenant super-admin dashboard — post-MVP
- SSL/HTTPS — configure after MVP demo (use HTTP for now)
- Hardware GPS device integration — post-MVP (mobile phone GPS is sufficient for pilot)
- Driver earnings approval/payment workflow — post-MVP (PENDING status is sufficient)

### If Something Is Unclear

The rule is: implement the simpler version that gets the demo working. The demo is: one driver, one truck, one trip, earnings shown. Everything else is post-MVP.

---

*SMRIT_DOCUMENTATION.md — End of Document*  
*Version 1.0.0 — June 2, 2026*  
*This document is the single source of truth for SMRIT. Do not implement anything that contradicts it.*