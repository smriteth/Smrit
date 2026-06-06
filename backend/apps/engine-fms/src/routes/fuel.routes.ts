import { Router, Response } from 'express';
import { z } from 'zod';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateQuery, paginationSchema, dateRangeSchema } from '../middleware/validateQuery';

const router = Router();

const fuelQuerySchema = paginationSchema.extend({
  truckId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// GET /api/fuel/stats — must come before /:id-style routes
router.get('/stats', requireUserAuth, validateQuery(dateRangeSchema), asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  const { from, to } = res.locals.query as z.infer<typeof dateRangeSchema>;

  const fromDate = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ?? new Date();

  const logs = await prisma.fmsFuelLog.findMany({
    where: { accountId: auth.accountId, filledAt: { gte: fromDate, lte: toDate } },
    orderBy: { filledAt: 'asc' },
  });

  const totalCostEtb = logs.reduce((s, l) => s + Number(l.costEtb), 0);
  const totalLiters = logs.reduce((s, l) => s + Number(l.liters), 0);

  // Group by ISO week
  const weekMap = new Map<string, { costEtb: number; liters: number }>();
  const getWeekKey = (d: Date) => {
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return mon.toISOString().slice(0, 10);
  };

  for (const log of logs) {
    const key = getWeekKey(log.filledAt);
    const e = weekMap.get(key) ?? { costEtb: 0, liters: 0 };
    e.costEtb += Number(log.costEtb);
    e.liters += Number(log.liters);
    weekMap.set(key, e);
  }

  const byWeek = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({
      week,
      costEtb: Math.round(v.costEtb * 100) / 100,
      liters: Math.round(v.liters * 10) / 10,
    }));

  // Fleet avg L/100km — approximate using total liters and total distance driven in same period
  const distanceAgg = await prisma.fmsTrip.aggregate({
    where: {
      accountId: auth.accountId,
      status: 'COMPLETED',
      completedAt: { gte: fromDate, lte: toDate },
    },
    _sum: { actualDistanceKm: true },
  });

  const totalDistanceKm = Number(distanceAgg._sum.actualDistanceKm ?? 0);
  const avgLitersPer100km = totalDistanceKm > 0
    ? Math.round((totalLiters / totalDistanceKm) * 100 * 10) / 10
    : 0;

  res.json({
    totalCostEtb: Math.round(totalCostEtb * 100) / 100,
    totalLiters: Math.round(totalLiters * 10) / 10,
    avgLitersPer100km,
    byWeek,
  });
}));

// GET /api/fuel
router.get('/', requireUserAuth, validateQuery(fuelQuerySchema), asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  const { truckId, from, to, limit, offset } = res.locals.query as z.infer<typeof fuelQuerySchema>;

  const logs = await prisma.fmsFuelLog.findMany({
    where: {
      accountId: auth.accountId,
      ...(truckId ? { truckId } : {}),
      ...(from || to
        ? {
            filledAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      truck: { select: { licensePlate: true } },
      driver: { select: { name: true } },
    },
    orderBy: { filledAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.json(logs);
}));

// POST /api/fuel
router.post('/', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({
    truckId: z.string(),
    driverId: z.string().optional(),
    tripId: z.string().optional(),
    liters: z.number().positive(),
    costEtb: z.number().positive(),
    odometerKm: z.number().int().nonnegative(),
    fuelType: z.enum(['DIESEL', 'PETROL', 'CNG']).optional().default('DIESEL'),
    filledAt: z.string().optional(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };

  const truck = await prisma.fmsTruck.findFirst({
    where: { id: body.data.truckId, accountId: auth.accountId },
  });
  if (!truck) return res.status(404).json({ error: 'Truck not found' });

  const log = await prisma.fmsFuelLog.create({
    data: {
      id: ulid(),
      accountId: auth.accountId,
      truckId: body.data.truckId,
      driverId: body.data.driverId ?? null,
      tripId: body.data.tripId ?? null,
      liters: body.data.liters,
      costEtb: body.data.costEtb,
      odometerKm: body.data.odometerKm,
      fuelType: body.data.fuelType,
      filledAt: body.data.filledAt ? new Date(body.data.filledAt) : new Date(),
    },
    include: {
      truck: { select: { licensePlate: true } },
      driver: { select: { name: true } },
    },
  });

  // Update truck odometer if this fill is more recent
  if (body.data.odometerKm > truck.odometerKm) {
    await prisma.fmsTruck.update({
      where: { id: body.data.truckId },
      data: { odometerKm: body.data.odometerKm },
    });
  }

  res.status(201).json(log);
}));

export default router;
