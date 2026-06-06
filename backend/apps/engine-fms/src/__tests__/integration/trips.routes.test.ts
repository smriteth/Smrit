import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('@smrit/shared-db', () => ({
  prisma: {
    fmsTrip: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    fmsDriverEarning: { create: vi.fn() },
    fmsDriver: { update: vi.fn() },
    fmsInspection: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

vi.mock('../../index', () => ({
  traccarServiceInstance: {
    getPositions: vi.fn().mockResolvedValue([]),
  },
  TraccarService: {
    totalDistanceKm: vi.fn().mockReturnValue(100),
  },
}));

vi.mock('../../services/alert.service', () => ({
  AlertService: { createAlert: vi.fn().mockResolvedValue(null) },
}));

import tripRoutes from '../../routes/trips.routes';
import { prisma } from '@smrit/shared-db';

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;
process.env.TRACCAR_OSMAND_ENDPOINT = 'http://localhost:5055/';

const driverToken = jwt.sign(
  {
    driverId: 'DRV1',
    accountId: 'ACC1',
    truckId: 'TRK1',
    traccarDeviceId: 42,
    traccarUniqueId: 'SMRIT_TRK1',
    type: 'driver',
  },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const userToken = jwt.sign(
  { userId: 'U1', accountId: 'ACC1', role: 'FLEET_OWNER', type: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const app = express();
app.use(express.json());
app.use('/api/trips', tripRoutes);

const mockTrip = {
  id: 'TRIP001',
  accountId: 'ACC1',
  truckId: 'TRK1',
  driverId: 'DRV1',
  traccarDeviceId: 42,
  originName: 'Addis Ababa',
  originLat: 9.02,
  originLng: 38.75,
  destinationName: 'Dire Dawa',
  destLat: 9.59,
  destLng: 41.86,
  status: 'STARTED',
  baseRatePerKm: 15,
  startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  plannedArrival: null,
  distanceChargesEtb: 0,
  bonusEtb: 0,
  penaltyEtb: 0,
  totalEarningsEtb: 0,
};

describe('POST /api/trips/start', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts trip successfully for driver', async () => {
    (prisma.fmsTrip.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null); // no active trip
    (prisma.fmsTrip.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);

    const res = await request(app)
      .post('/api/trips/start')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        originName: 'Addis Ababa',
        originLat: 9.02,
        originLng: 38.75,
        destinationName: 'Dire Dawa',
        destLat: 9.59,
        destLng: 41.86,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('tripId');
    expect(res.body.traccarUniqueId).toBe('SMRIT_TRK1');
  });

  it('returns 409 when driver already has active trip', async () => {
    (prisma.fmsTrip.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);

    const res = await request(app)
      .post('/api/trips/start')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        originName: 'Addis Ababa',
        originLat: 9.02,
        originLng: 38.75,
        destinationName: 'Hawassa',
        destLat: 7.05,
        destLng: 38.47,
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('tripId');
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/trips/start')
      .send({ originName: 'A', originLat: 9, originLng: 38, destinationName: 'B', destLat: 9.5, destLng: 38.5 });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user token used on driver endpoint', async () => {
    const res = await request(app)
      .post('/api/trips/start')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ originName: 'A', originLat: 9, originLng: 38, destinationName: 'B', destLat: 9.5, destLng: 38.5 });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/trips/:id/complete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('completes trip and returns earnings', async () => {
    (prisma.fmsTrip.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);
    (prisma.fmsTrip.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockTrip, status: 'COMPLETED' });
    (prisma.fmsDriverEarning.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.fmsDriver.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.$transaction as unknown) ??
      ((prisma as unknown as Record<string, unknown>).$transaction = vi.fn().mockImplementation(
        async (ops: unknown[]) => Promise.all((ops as Promise<unknown>[]).map((op) => op)),
      ));

    const res = await request(app)
      .post('/api/trips/TRIP001/complete')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('earnings');
    expect(res.body.earnings.currency).toBe('ETB');
  });

  it('returns 404 for non-existent trip', async () => {
    (prisma.fmsTrip.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/trips/NONEXISTENT/complete')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when completing another driver trip', async () => {
    (prisma.fmsTrip.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockTrip,
      driverId: 'DIFFERENT_DRIVER',
    });

    const res = await request(app)
      .post('/api/trips/TRIP001/complete')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/trips', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns trip list for user', async () => {
    (prisma.fmsTrip.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        ...mockTrip,
        driver: { id: 'DRV1', name: 'Abebe Girma', phone: '+251911100001' },
        truck: { id: 'TRK1', licensePlate: 'AA 12345 A', model: 'Isuzu FVR 34' },
      },
    ]);

    const res = await request(app)
      .get('/api/trips')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].driver.name).toBe('Abebe Girma');
  });

  it('returns 401 for driver token on trips list', async () => {
    const res = await request(app)
      .get('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(403);
  });
});
