import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('@smrit/shared-db', () => ({
  prisma: {
    fmsTruck: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const traccarServiceInstance = {
  getLatestPositions: vi.fn().mockResolvedValue([]),
  createDevice: vi.fn().mockResolvedValue({ id: 42 }),
  getPositions: vi.fn().mockResolvedValue([]),
};

vi.mock('../../runtime', () => ({
  getTraccarServiceInstance: vi.fn(() => traccarServiceInstance),
}));

import deviceRoutes from '../../routes/devices.routes';
import { prisma } from '@smrit/shared-db';

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

const userToken = jwt.sign(
  { userId: 'U1', accountId: 'ACC1', role: 'FLEET_OWNER', type: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const app = express();
app.use(express.json());
app.use('/api/devices', deviceRoutes);

const mockTruck = {
  id: 'TRK001',
  accountId: 'ACC1',
  licensePlate: 'AA 12345 A',
  model: 'Isuzu FVR 34',
  year: 2020,
  status: 'ACTIVE',
  fuelType: 'DIESEL',
  odometerKm: 45200,
  insuranceExpiry: null,
  registrationExpiry: null,
  nextServiceKm: null,
  traccarDeviceId: 42,
  traccarUniqueId: 'SMRIT_TRK001',
  activeDriver: null,
};

describe('GET /api/devices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns truck list for authenticated user', async () => {
    (prisma.fmsTruck.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockTruck]);

    const res = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].licensePlate).toBe('AA 12345 A');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/devices');
    expect(res.status).toBe(401);
  });

  it('returns trucks without positions when Traccar is unavailable', async () => {
    (traccarServiceInstance.getLatestPositions as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Connection refused'),
    );
    (prisma.fmsTruck.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockTruck]);

    const res = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0].position).toBeNull();
  });
});

describe('POST /api/devices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates truck successfully', async () => {
    (prisma.fmsTruck.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTruck);

    const res = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        licensePlate: 'AA 12345 A',
        model: 'Isuzu FVR 34',
        year: 2020,
        capacityKg: 10000,
      });

    expect(res.status).toBe(201);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ licensePlate: 'AA 12345 A' }); // missing model, year, capacityKg

    expect(res.status).toBe(400);
  });

  it('returns 403 when driver token used on user endpoint', async () => {
    const driverToken = jwt.sign(
      { driverId: 'D1', accountId: 'ACC1', type: 'driver' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ licensePlate: 'AA 99999 Z', model: 'Test', year: 2022, capacityKg: 5000 });

    expect(res.status).toBe(403);
  });
});
