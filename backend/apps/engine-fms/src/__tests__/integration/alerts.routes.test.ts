import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('@smrit/shared-db', () => ({
  prisma: {
    fmsAlert: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    fmsTruck: { findMany: vi.fn().mockResolvedValue([]) },
    fmsDriver: { findMany: vi.fn().mockResolvedValue([]) },
    fmsMaintenanceRecord: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../services/alert.service', () => ({
  AlertService: {
    checkAndCreateExpiryAlerts: vi.fn().mockResolvedValue(undefined),
    createAlert: vi.fn().mockResolvedValue(null),
  },
}));

import alertRoutes from '../../routes/alerts.routes';
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
app.use('/api/alerts', alertRoutes);

const mockAlerts = [
  {
    id: 'ALT001',
    accountId: 'ACC1',
    type: 'SPEEDING',
    severity: 'HIGH',
    message: 'Truck exceeded 120 km/h',
    isRead: false,
    truckId: 'TRK1',
    driverId: null,
    metadata: null,
    createdAt: new Date(),
  },
];

describe('GET /api/alerts/unread-count', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns unread count', async () => {
    (prisma.fmsAlert.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

    const res = await request(app)
      .get('/api/alerts/unread-count')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });
});

describe('GET /api/alerts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns alerts list', async () => {
    (prisma.fmsAlert.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockAlerts);

    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0].type).toBe('SPEEDING');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/alerts/:id/read', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks alert as read', async () => {
    (prisma.fmsAlert.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockAlerts[0]);
    (prisma.fmsAlert.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockAlerts[0], isRead: true });

    const res = await request(app)
      .patch('/api/alerts/ALT001/read')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for non-existent alert', async () => {
    (prisma.fmsAlert.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/alerts/NONEXISTENT/read')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/alerts/read-all', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks all alerts as read', async () => {
    (prisma.fmsAlert.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 5 });

    const res = await request(app)
      .patch('/api/alerts/read-all')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
