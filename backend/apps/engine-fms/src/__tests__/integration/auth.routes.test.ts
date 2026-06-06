import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock both prisma and bcrypt before importing routes
vi.mock('@smrit/shared-db', () => ({
  prisma: {
    fmsUser: {
      findUnique: vi.fn(),
    },
    fmsDriver: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('$2b$10$mockedHash'),
  },
  compare: vi.fn(),
  hash: vi.fn().mockResolvedValue('$2b$10$mockedHash'),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock.jwt.token'),
    verify: vi.fn(),
  },
  sign: vi.fn(() => 'mock.jwt.token'),
  verify: vi.fn(),
}));

import accountRoutes from '../../routes/accounts.routes';
import { prisma } from '@smrit/shared-db';
import bcrypt from 'bcrypt';

const app = express();
app.use(express.json());
app.use('/api', accountRoutes);

const mockUser = {
  id: 'USER001',
  accountId: 'ACCT001',
  email: 'admin@smrit.et',
  passwordHash: '$2b$10$mockedHash',
  role: 'FLEET_OWNER',
  isActive: true,
};

const mockDriver = {
  id: 'DRV001',
  accountId: 'ACCT001',
  name: 'Abebe Girma',
  phone: '+251911100001',
  passwordHash: '$2b$10$mockedHash',
  status: 'ACTIVE',
  assignedTruck: {
    id: 'TRK001',
    model: 'Isuzu FVR 34',
    licensePlate: 'AA 12345 A',
    traccarDeviceId: 42,
    traccarUniqueId: 'SMRIT_TRK001',
  },
};

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns token for valid credentials', async () => {
    (prisma.fmsUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@smrit.et', password: 'smrit2026' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toBe('FLEET_OWNER');
  });

  it('returns 401 for wrong password', async () => {
    (prisma.fmsUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@smrit.et', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 for non-existent user', async () => {
    (prisma.fmsUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@smrit.et', password: 'anything' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for inactive user', async () => {
    (prisma.fmsUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockUser,
      isActive: false,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@smrit.et', password: 'smrit2026' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'smrit2026' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/driver/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns token and truck info for valid driver credentials', async () => {
    (prisma.fmsDriver.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockDriver);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/driver/login')
      .send({ phone: '+251911100001', password: 'driver123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('driver');
    expect(res.body).toHaveProperty('truck');
    expect(res.body.driver.name).toBe('Abebe Girma');
  });

  it('returns 403 when driver has no assigned truck', async () => {
    (prisma.fmsDriver.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockDriver,
      assignedTruck: null,
    });
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/driver/login')
      .send({ phone: '+251911100001', password: 'driver123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/no truck/i);
  });

  it('returns 401 for wrong password', async () => {
    (prisma.fmsDriver.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockDriver);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/driver/login')
      .send({ phone: '+251911100001', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for suspended driver', async () => {
    (prisma.fmsDriver.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockDriver,
      status: 'SUSPENDED',
    });

    const res = await request(app)
      .post('/api/auth/driver/login')
      .send({ phone: '+251911100001', password: 'driver123' });

    expect(res.status).toBe(401);
  });
});
