import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('@smrit/shared-db', () => ({
  prisma: {
    fmsDriver: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    fmsDriverEarning: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  },
  hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
}));

import driverRoutes from '../../routes/drivers.routes';
import { prisma } from '@smrit/shared-db';

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

const userToken = jwt.sign(
  { userId: 'U1', accountId: 'ACC1', role: 'FLEET_OWNER', type: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' },
);
const driverToken = jwt.sign(
  { driverId: 'DRV1', accountId: 'ACC1', truckId: 'TRK1', traccarDeviceId: 1, traccarUniqueId: 'X', type: 'driver' },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const app = express();
app.use(express.json());
app.use('/api/drivers', driverRoutes);

const mockDriver = {
  id: 'DRV001',
  accountId: 'ACC1',
  name: 'Abebe Girma',
  phone: '+251911100001',
  passwordHash: '$2b$10$x',
  licenseNumber: 'ET123456',
  licenseExpiry: new Date('2027-01-01'),
  status: 'ACTIVE',
  totalTrips: 5,
  totalEarningsEtb: 7500,
  behaviorScore: 85,
  emergencyContact: null,
  assignedTruckId: 'TRK1',
  createdAt: new Date(),
  assignedTruck: { id: 'TRK1', licensePlate: 'AA 12345 A', model: 'Isuzu FVR' },
};

describe('GET /api/drivers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns drivers list', async () => {
    (prisma.fmsDriver.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockDriver]);

    const res = await request(app).get('/api/drivers').set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Abebe Girma');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/drivers');
    expect(res.status).toBe(401);
  });

  it('returns 403 for driver token', async () => {
    const res = await request(app)
      .get('/api/drivers')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/drivers/:id/earnings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns earnings summary for valid driver', async () => {
    (prisma.fmsDriver.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockDriver);
    (prisma.fmsDriverEarning.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { totalEarning: 2500, status: 'PAID', trip: { originName: 'A', destinationName: 'B', startedAt: new Date() }, createdAt: new Date() },
      { totalEarning: 1200, status: 'PENDING', trip: null, createdAt: new Date() },
    ]);
    (prisma.fmsDriverEarning.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { totalEarning: 1200 },
    });

    const res = await request(app)
      .get('/api/drivers/DRV001/earnings')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toHaveProperty('totalEtb');
    expect(res.body.summary).toHaveProperty('pendingEtb');
    expect(res.body.summary).toHaveProperty('paidEtb');
    expect(res.body.earnings).toHaveLength(2);
  });

  it('returns 404 for driver not in account', async () => {
    (prisma.fmsDriver.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/drivers/NOBODY/earnings')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/drivers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a driver', async () => {
    (prisma.fmsDriver.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockDriver);

    const res = await request(app)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Abebe Girma',
        phone: '+251911100001',
        password: 'pass1234',
        licenseNumber: 'ET123456',
        licenseExpiry: '2027-01-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Abebe Girma');
  });

  it('returns 400 for short password', async () => {
    const res = await request(app)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Test', phone: '+251911100001', password: '123', licenseNumber: 'X', licenseExpiry: '2027-01-01' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/drivers/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates driver status', async () => {
    (prisma.fmsDriver.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockDriver);
    (prisma.fmsDriver.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockDriver, status: 'SUSPENDED' });

    const res = await request(app)
      .patch('/api/drivers/DRV001')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'SUSPENDED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUSPENDED');
  });
});
