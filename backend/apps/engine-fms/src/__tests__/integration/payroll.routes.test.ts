import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('@smrit/shared-db', () => ({
  prisma: {
    fmsDriverEarning: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import payrollRoutes from '../../routes/payroll.routes';
import { prisma } from '@smrit/shared-db';

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

const ownerToken = jwt.sign(
  { userId: 'U1', accountId: 'ACC1', role: 'FLEET_OWNER', type: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const managerToken = jwt.sign(
  { userId: 'U2', accountId: 'ACC1', role: 'FLEET_MANAGER', type: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const app = express();
app.use(express.json());
app.use('/api/payroll', payrollRoutes);

const mockEarning = {
  id: 'EARN001',
  driverId: 'DRV1',
  tripId: 'TRIP001',
  distanceKm: 526.3,
  ratePerKm: 15,
  baseEarning: 7894.5,
  bonus: 394.7,
  penalty: 0,
  totalEarning: 8289.2,
  status: 'PENDING',
  driver: { id: 'DRV1', name: 'Abebe Girma' },
  trip: { id: 'TRIP001', originName: 'Addis Ababa', destinationName: 'Dire Dawa', startedAt: new Date(), actualDistanceKm: 526.3 },
};

describe('GET /api/payroll/pending', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns pending earnings list', async () => {
    (prisma.fmsDriverEarning.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockEarning]);

    const res = await request(app)
      .get('/api/payroll/pending')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0].status).toBe('PENDING');
    expect(res.body[0].driver.name).toBe('Abebe Girma');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/payroll/pending');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/payroll/:id/approve', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approves earning for FLEET_OWNER', async () => {
    (prisma.fmsDriverEarning.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockEarning);
    (prisma.fmsDriverEarning.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockEarning,
      status: 'APPROVED',
    });

    const res = await request(app)
      .patch('/api/payroll/EARN001/approve')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');
  });

  it('returns 403 for FLEET_MANAGER role', async () => {
    const res = await request(app)
      .patch('/api/payroll/EARN001/approve')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 409 when trying to approve non-PENDING earning', async () => {
    (prisma.fmsDriverEarning.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockEarning,
      status: 'APPROVED',
    });

    const res = await request(app)
      .patch('/api/payroll/EARN001/approve')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/payroll/:id/pay', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks approved earning as paid', async () => {
    (prisma.fmsDriverEarning.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockEarning,
      status: 'APPROVED',
    });
    (prisma.fmsDriverEarning.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockEarning,
      status: 'PAID',
      paidAt: new Date(),
    });

    const res = await request(app)
      .patch('/api/payroll/EARN001/pay')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ paymentRef: 'CBE-TXN-12345' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAID');
  });

  it('returns 409 when trying to pay non-APPROVED earning', async () => {
    (prisma.fmsDriverEarning.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockEarning); // status PENDING

    const res = await request(app)
      .patch('/api/payroll/EARN001/pay')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(409);
  });
});
