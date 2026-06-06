import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('@smrit/shared-db', () => ({
  prisma: {
    fmsMaintenanceRecord: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    fmsTruck: {
      findFirst: vi.fn(),
    },
  },
}));

import maintenanceRoutes from '../../routes/maintenance.routes';
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
app.use('/api/maintenance', maintenanceRoutes);

const mockRecord = {
  id: 'MNT001',
  accountId: 'ACC1',
  truckId: 'TRK1',
  type: 'OIL_CHANGE',
  scheduledAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  status: 'SCHEDULED',
  truck: { licensePlate: 'AA 12345 A', model: 'Isuzu FVR 34' },
};

describe('GET /api/maintenance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns maintenance records', async () => {
    (prisma.fmsMaintenanceRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockRecord]);

    const res = await request(app)
      .get('/api/maintenance')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0].type).toBe('OIL_CHANGE');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/maintenance');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/maintenance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates maintenance record', async () => {
    (prisma.fmsTruck.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'TRK1' });
    (prisma.fmsMaintenanceRecord.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecord);

    const res = await request(app)
      .post('/api/maintenance')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        truckId: 'TRK1',
        type: 'OIL_CHANGE',
        scheduledAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid type', async () => {
    const res = await request(app)
      .post('/api/maintenance')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ truckId: 'TRK1', type: 'INVALID_TYPE', scheduledAt: new Date().toISOString() });

    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent truck', async () => {
    (prisma.fmsTruck.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/maintenance')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ truckId: 'NONEXISTENT', type: 'OIL_CHANGE', scheduledAt: new Date().toISOString() });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/maintenance/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates maintenance record status', async () => {
    (prisma.fmsMaintenanceRecord.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecord);
    (prisma.fmsMaintenanceRecord.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockRecord,
      status: 'COMPLETED',
    });

    const res = await request(app)
      .patch('/api/maintenance/MNT001')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'COMPLETED', completedAt: new Date().toISOString(), costEtb: 3500 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
  });
});
