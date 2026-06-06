import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('@smrit/shared-db', () => ({
  prisma: {
    fmsFuelLog: {
      findMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    fmsTruck: { findFirst: vi.fn(), update: vi.fn() },
    fmsTrip: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { actualDistanceKm: 0 } }),
    },
  },
}));

import fuelRoutes from '../../routes/fuel.routes';
import { prisma } from '@smrit/shared-db';

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

const userToken = jwt.sign(
  { userId: 'U1', accountId: 'ACC1', role: 'FLEET_MANAGER', type: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const app = express();
app.use(express.json());
app.use('/api/fuel', fuelRoutes);

const mockLog = {
  id: 'FUEL001',
  accountId: 'ACC1',
  truckId: 'TRK1',
  driverId: null,
  liters: 80,
  costEtb: 5000,
  odometerKm: 45000,
  fuelType: 'DIESEL',
  filledAt: new Date(),
  truck: { licensePlate: 'AA 12345 A' },
  driver: null,
};

describe('GET /api/fuel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns fuel logs', async () => {
    (prisma.fmsFuelLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockLog]);

    const res = await request(app).get('/api/fuel').set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe('FUEL001');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/fuel');
    expect(res.status).toBe(401);
  });

  it('rejects limit over 200', async () => {
    const res = await request(app).get('/api/fuel?limit=500').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
  });

  it('rejects invalid from date', async () => {
    const res = await request(app)
      .get('/api/fuel?from=not-a-date')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/fuel/stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns stats object', async () => {
    (prisma.fmsFuelLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...mockLog, costEtb: 5000, liters: 80, filledAt: new Date() },
    ]);
    (prisma.fmsTrip.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { actualDistanceKm: 400 },
    });

    const res = await request(app)
      .get('/api/fuel/stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalCostEtb');
    expect(res.body).toHaveProperty('totalLiters');
    expect(res.body).toHaveProperty('avgLitersPer100km');
    expect(res.body).toHaveProperty('byWeek');
  });

  it('rejects invalid to date', async () => {
    const res = await request(app)
      .get('/api/fuel/stats?to=bad')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/fuel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a fuel log', async () => {
    (prisma.fmsTruck.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'TRK1', odometerKm: 44000 });
    (prisma.fmsFuelLog.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockLog);
    (prisma.fmsTruck.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const res = await request(app)
      .post('/api/fuel')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ truckId: 'TRK1', liters: 80, costEtb: 5000, odometerKm: 45000 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('FUEL001');
  });

  it('returns 404 for unknown truck', async () => {
    (prisma.fmsTruck.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/fuel')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ truckId: 'UNKNOWN', liters: 80, costEtb: 5000, odometerKm: 45000 });

    expect(res.status).toBe(404);
  });
});
