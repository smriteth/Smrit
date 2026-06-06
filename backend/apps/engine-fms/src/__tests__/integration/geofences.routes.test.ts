import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('@smrit/shared-db', () => ({
  prisma: {
    fmsGeofence: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    fmsGeofenceEvent: {
      findMany: vi.fn(),
    },
  },
}));

import geofenceRoutes from '../../routes/geofences.routes';
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
app.use('/api/geofences', geofenceRoutes);

const mockGeofence = {
  id: 'GEO001',
  accountId: 'ACC1',
  name: 'Addis City Limit',
  type: 'ALERT',
  isActive: true,
  polygon: [{ lat: 9.0, lng: 38.7 }, { lat: 9.1, lng: 38.7 }, { lat: 9.05, lng: 38.8 }],
  createdAt: new Date(),
};

describe('GET /api/geofences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns geofences list', async () => {
    (prisma.fmsGeofence.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockGeofence]);

    const res = await request(app).get('/api/geofences').set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Addis City Limit');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/geofences');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/geofences/events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns events list', async () => {
    (prisma.fmsGeofenceEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/geofences/events')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rejects limit over 200', async () => {
    const res = await request(app)
      .get('/api/geofences/events?limit=9999')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/geofences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a geofence', async () => {
    (prisma.fmsGeofence.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockGeofence);

    const res = await request(app)
      .post('/api/geofences')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Addis City Limit',
        type: 'ALERT',
        polygon: [{ lat: 9.0, lng: 38.7 }, { lat: 9.1, lng: 38.7 }, { lat: 9.05, lng: 38.8 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Addis City Limit');
  });

  it('returns 400 for polygon with fewer than 3 points', async () => {
    const res = await request(app)
      .post('/api/geofences')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Bad', type: 'ALERT', polygon: [{ lat: 9, lng: 38 }] });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/geofences/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes existing geofence', async () => {
    (prisma.fmsGeofence.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockGeofence);
    (prisma.fmsGeofence.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockGeofence);

    const res = await request(app)
      .delete('/api/geofences/GEO001')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 for unknown geofence', async () => {
    (prisma.fmsGeofence.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/geofences/NOEXIST')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
  });
});
