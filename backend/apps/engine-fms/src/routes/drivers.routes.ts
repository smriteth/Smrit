import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/drivers — list all drivers for account
router.get('/', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  const drivers = await prisma.fmsDriver.findMany({
    where: { accountId: auth.accountId },
    include: {
      assignedTruck: {
        select: { id: true, licensePlate: true, model: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(drivers);
}));

// GET /api/drivers/:id/earnings — must precede /:id generic
router.get('/:id/earnings', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };

  const driver = await prisma.fmsDriver.findFirst({
    where: { id: req.params.id, accountId: auth.accountId },
  });
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allEarnings, monthEarnings] = await Promise.all([
    prisma.fmsDriverEarning.findMany({
      where: { driverId: req.params.id },
      include: {
        trip: {
          select: { originName: true, destinationName: true, startedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.fmsDriverEarning.aggregate({
      where: { driverId: req.params.id, createdAt: { gte: monthStart } },
      _sum: { totalEarning: true },
    }),
  ]);

  const totalEtb = allEarnings.reduce((s, e) => s + Number(e.totalEarning), 0);
  const pendingEtb = allEarnings
    .filter((e) => e.status === 'PENDING')
    .reduce((s, e) => s + Number(e.totalEarning), 0);
  const paidEtb = allEarnings
    .filter((e) => e.status === 'PAID')
    .reduce((s, e) => s + Number(e.totalEarning), 0);

  res.json({
    summary: {
      totalEtb: Math.round(totalEtb * 100) / 100,
      thisMonthEtb: Math.round(Number(monthEarnings._sum.totalEarning ?? 0) * 100) / 100,
      pendingEtb: Math.round(pendingEtb * 100) / 100,
      paidEtb: Math.round(paidEtb * 100) / 100,
    },
    earnings: allEarnings,
  });
}));

// POST /api/drivers — create driver
router.post('/', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    phone: z.string(),
    password: z.string().min(6),
    licenseNumber: z.string(),
    licenseExpiry: z.string(),
    assignedTruckId: z.string().optional(),
    emergencyContact: z.string().optional(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };
  const passwordHash = await bcrypt.hash(body.data.password, 10);

  const driver = await prisma.fmsDriver.create({
    data: {
      id: ulid(),
      accountId: auth.accountId,
      name: body.data.name,
      phone: body.data.phone,
      passwordHash,
      licenseNumber: body.data.licenseNumber,
      licenseExpiry: new Date(body.data.licenseExpiry),
      assignedTruckId: body.data.assignedTruckId ?? null,
      emergencyContact: body.data.emergencyContact ?? null,
    },
  });

  res.status(201).json(driver);
}));

// PATCH /api/drivers/:id
router.patch('/:id', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({
    name: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    assignedTruckId: z.string().nullable().optional(),
    emergencyContact: z.string().optional(),
    behaviorScore: z.number().int().min(0).max(100).optional(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };

  const driver = await prisma.fmsDriver.findFirst({
    where: { id: req.params.id, accountId: auth.accountId },
  });
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const updated = await prisma.fmsDriver.update({
    where: { id: req.params.id },
    data: body.data,
  });

  res.json(updated);
}));

export default router;
