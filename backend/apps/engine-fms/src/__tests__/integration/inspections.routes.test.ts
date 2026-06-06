import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('@smrit/shared-db', () => ({
  prisma: {
    fmsInspection: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    fmsTruck: { findFirst: vi.fn() },
  },
}));

import inspectionRoutes from '../../routes/inspections.routes';
import { prisma } from '@smrit/shared-db';

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

const userToken = jwt.sign(
  { userId: 'U1', accountId: 'ACC1', role: 'FLEET_MANAGER', type: 'user' },
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
app.use('/api/inspections', inspectionRoutes);

const mockInspection = {
  id: 'INSP001',
  accountId: 'ACC1',
  truckId: 'TRK1',
  driverId: 'DRV1',
  type: 'PRE_TRIP',
  checklist: [{ item: 'Tyres', passed: true }],
  status: 'PASSED',
  notes: null,
  completedAt: new Date(),
  createdAt: new Date(),
  truck: { licensePlate: 'AA 12345 A' },
  driver: { name: 'Abebe Girma' },
};

describe('GET /api/inspections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns inspections list for user', async () => {
    (prisma.fmsInspection.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockInspection]);

    const res = await request(app)
      .get('/api/inspections')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe('INSP001');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/inspections');
    expect(res.status).toBe(401);
  });

  it('returns 403 for driver token on user-only endpoint', async () => {
    const res = await request(app)
      .get('/api/inspections')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid limit', async () => {
    const res = await request(app)
      .get('/api/inspections?limit=99999')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative offset', async () => {
    const res = await request(app)
      .get('/api/inspections?offset=-1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/inspections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('driver can create inspection', async () => {
    (prisma.fmsTruck.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'TRK1' });
    (prisma.fmsInspection.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockInspection);

    const res = await request(app)
      .post('/api/inspections')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        truckId: 'TRK1',
        type: 'PRE_TRIP',
        checklist: [{ item: 'Tyres', passed: true }],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('INSP001');
  });

  it('user can create inspection with driverId', async () => {
    (prisma.fmsTruck.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'TRK1' });
    (prisma.fmsInspection.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockInspection);

    const res = await request(app)
      .post('/api/inspections')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        truckId: 'TRK1',
        driverId: 'DRV1',
        type: 'PRE_TRIP',
        checklist: [{ item: 'Tyres', passed: true }],
      });

    expect(res.status).toBe(201);
  });

  it('user creation without driverId returns 400', async () => {
    const res = await request(app)
      .post('/api/inspections')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ truckId: 'TRK1', type: 'PRE_TRIP', checklist: [{ item: 'Tyres', passed: true }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/driverId/i);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/inspections').send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty checklist', async () => {
    (prisma.fmsTruck.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'TRK1' });

    const res = await request(app)
      .post('/api/inspections')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ truckId: 'TRK1', type: 'PRE_TRIP', checklist: [] });

    expect(res.status).toBe(400);
  });

  it('returns 404 when truck does not belong to account', async () => {
    (prisma.fmsTruck.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/inspections')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ truckId: 'WRONG', type: 'PRE_TRIP', checklist: [{ item: 'Tyres', passed: true }] });

    expect(res.status).toBe(404);
  });
});
