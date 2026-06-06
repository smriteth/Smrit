# 🚀 SMRIT — START HERE

**Everything is built. Ready to test.**

---

## 5-Minute Startup

### Step 1: Start Infrastructure (30 seconds)
```powershell
cd c:\Users\ygebr\Desktop\SMRIT
docker compose up -d postgres redis traccar nginx
```

### Step 2: Initialize Database (1 minute)
```powershell
cd backend
pnpm db:migrate
pnpm db:seed
```

### Step 3: Start Backend (one terminal)
```powershell
cd backend
pnpm dev
# Runs on http://localhost:3016
```

### Step 4: Start Frontend (another terminal)
```powershell
cd frontend
npm run dev
# Runs on http://localhost:5173
# Login: admin@smrit.et / smrit2026
```

### Step 5: Start Mobile (another terminal, optional)
```powershell
cd mobile/smrit-driver
flutter pub get
flutter run
```

---

## Testing the Flow

1. **Create a truck** in dashboard (`/trucks` page)
2. **Create a driver** in dashboard (`/drivers` page)
3. **Login driver** on mobile app (use phone created in step 2)
4. **Start trip** on mobile (top green button)
5. **Stop trip** on mobile (big red button)
6. **Check earnings** in mobile summary
7. **Verify in dashboard** at `/trips`

---

## Credentials

- **Dashboard**: admin@smrit.et / smrit2026
- **Docker PostgreSQL**: smrit_user / smrit_dev_password_123
- **Traccar Admin**: admin@smrit.et / smrit_traccar_password_123

---

## Architecture

```
React Dashboard (port 5173) ──► Express API (port 3016) ──► PostgreSQL (port 5432)
                                       ↓
                                  Traccar (port 8082)
                                       ↓
                                GPS Database

Flutter App ──────────────► Traccar OsmAnd (port 5055)
```

---

## Verify Services

```bash
# Check Docker containers
docker compose ps

# Test API health
curl http://localhost:3016/health

# Test Traccar
curl http://localhost:8082/api/server

# Test database
psql -h localhost -U smrit_user -d smrit_fms -c "SELECT COUNT(*) FROM \"FmsAccount\""
```

---

## What's Ready

✅ **Backend**: Node.js API with all endpoints  
✅ **Frontend**: React dashboard with map & tables  
✅ **Mobile**: Flutter driver app with GPS  
✅ **Database**: Prisma schema + demo data  
✅ **Infrastructure**: Docker services running  
✅ **Compilation**: All TypeScript builds passing  

---

## Troubleshooting

### Port already in use?
```bash
# Find process on port 3016 (backend)
netstat -ano | findstr :3016

# Find process on port 5173 (frontend)
netstat -ano | findstr :5173
```

### Docker services won't start?
```bash
# Clean up and retry
docker compose down -v
docker compose up -d postgres redis traccar nginx
sleep 30
```

### Database migration fails?
```bash
# Reset database
docker exec smrit_postgres dropdb -U smrit_user smrit_fms --if-exists
pnpm db:migrate
pnpm db:seed
```

### Frontend can't reach API?
- Check backend is running: `curl http://localhost:3016/health`
- Check vite config proxy to `/api` → `http://localhost:3016`
- Check CORS is enabled in backend

### Mobile won't connect to API?
- Emulator: Use `http://10.0.2.2:3016/api` (Android special IP)
- Physical device: Use actual machine IP on local network
- Check firewall allows port 3016

---

## Key Files to Review

- **API Routes**: `backend/apps/engine-fms/src/routes/*.ts`
- **Database Schema**: `backend/packages/shared-db/prisma/schema.prisma`
- **Dashboard Pages**: `frontend/src/pages/*.tsx`
- **Mobile Screens**: `mobile/smrit-driver/lib/screens/*.dart`
- **Environment**: `.env` (passwords + secrets)

---

## Documentation

- **README.md**: Full setup guide
- **SMRIT_DOCUMENTATION.md**: Complete spec (original)
- **CLAUDE.md**: Agent instructions
- **Status.md**: Implementation summary

---

## All Done! 🎉

No more code to write. Start testing now.

```bash
# Quick start (copy-paste entire block)
cd c:\Users\ygebr\Desktop\SMRIT && \
docker compose up -d && \
sleep 30 && \
cd backend && \
pnpm db:migrate && \
pnpm db:seed && \
pnpm dev
```

In another terminal:
```bash
cd c:\Users\ygebr\Desktop\SMRIT\frontend && npm run dev
```

Visit: http://localhost:5173 → Login: admin@smrit.et / smrit2026

---

**June 3, 2026 — Implementation Complete**
