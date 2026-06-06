import { Router, Response } from 'express';
import { z } from 'zod';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth, requireDriverAuth, DriverAuthPayload } from '../middleware/auth.middleware';
import { TraccarService } from '../services/traccar.service';
import { AlertService } from '../services/alert.service';
import { asyncHandler } from '../utils/asyncHandler';
import { validateQuery, paginationSchema } from '../middleware/validateQuery';
import { logger } from '../utils/logger';
import { getTraccarServiceInstance, getTraccarOsmAndEndpoint } from '../runtime';

const router = Router();

const tripListQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  driverId: z.string().optional(),
  truckId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// POST /api/trips/start - driver starts a trip
router.post('/start', requireDriverAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({
    originName: z.string(),
    originLat: z.number(),
    originLng: z.number(),
    destinationName: z.string(),
    destLat: z.number(),
    destLng: z.number(),
    baseRatePerKm: z.number().optional().default(15),
    cargoDescription: z.string().optional(),
    cargoWeightKg: z.number().int().positive().optional(),
    plannedArrival: z.string().optional(),
    preInspectionId: z.string().optional(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as DriverAuthPayload;

  // Check no active trip already running
  const activeTrip = await prisma.fmsTrip.findFirst({
    where: { driverId: auth.driverId, status: { in: ['STARTED', 'IN_TRANSIT'] } },
  });
  if (activeTrip) {
    return res.status(409).json({ error: 'Driver already has an active trip', tripId: activeTrip.id });
  }

  // Validate pre-inspection if provided
  if (body.data.preInspectionId) {
    const inspection = await prisma.fmsInspection.findFirst({
      where: { id: body.data.preInspectionId, driverId: auth.driverId },
    });
    if (!inspection) {
      return res.status(400).json({ error: 'Pre-trip inspection not found' });
    }
    if (inspection.status === 'FAILED') {
      return res.status(400).json({ error: 'Cannot start trip - pre-trip inspection failed' });
    }
  }

  const trip = await prisma.fmsTrip.create({
    data: {
      id: ulid(),
      accountId: auth.accountId,
      truckId: auth.truckId,
      driverId: auth.driverId,
      traccarDeviceId: auth.traccarDeviceId,
      originName: body.data.originName,
      originLat: body.data.originLat,
      originLng: body.data.originLng,
      destinationName: body.data.destinationName,
      destLat: body.data.destLat,
      destLng: body.data.destLng,
      baseRatePerKm: body.data.baseRatePerKm,
      cargoDescription: body.data.cargoDescription ?? null,
      cargoWeightKg: body.data.cargoWeightKg ?? null,
      plannedArrival: body.data.plannedArrival ? new Date(body.data.plannedArrival) : null,
      preInspectionId: body.data.preInspectionId ?? null,
      status: 'STARTED',
    },
  });

  res.status(201).json({
    tripId: trip.id,
    message: 'Trip started. GPS tracking active.',
    traccarUniqueId: auth.traccarUniqueId,
    osmandEndpoint: getTraccarOsmAndEndpoint(),
  });
}));

// POST /api/trips/:id/complete - driver completes trip
router.post('/:id/complete', requireDriverAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as DriverAuthPayload;

  const trip = await prisma.fmsTrip.findUnique({ where: { id: req.params.id } });
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.driverId !== auth.driverId) return res.status(403).json({ error: 'Not your trip' });
  if (trip.status === 'COMPLETED') return res.status(409).json({ error: 'Trip already completed' });

  try {
    // Fetch GPS positions from Traccar for this trip's duration
    const positions = await getTraccarServiceInstance().getPositions(
      trip.traccarDeviceId,
      trip.startedAt,
      new Date(),
    );

    const actualDistanceKm = TraccarService.totalDistanceKm(positions);

    // Speed stats
    const speeds = positions.map((p) => Math.round(p.speed * 1.852));
    const maxSpeedKmh = speeds.length ? Math.max(...speeds) : 0;
    const avgSpeedKmh = speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;

    // Earnings
    const distanceChargesEtb = actualDistanceKm * Number(trip.baseRatePerKm);
    const now = new Date();
    let bonusEtb = 0;
    let penaltyEtb = 0;
    if (trip.plannedArrival) {
      if (now <= trip.plannedArrival) {
        bonusEtb = Math.round(distanceChargesEtb * 0.05 * 100) / 100;
      } else {
        const lateHours = (now.getTime() - trip.plannedArrival.getTime()) / 3_600_000;
        penaltyEtb = Math.round(distanceChargesEtb * 0.02 * lateHours * 100) / 100;
      }
    }
    const totalEarningsEtb = distanceChargesEtb + bonusEtb - penaltyEtb;

    // Update trip + create earning record atomically
    await prisma.$transaction([
      prisma.fmsTrip.update({
        where: { id: trip.id },
        data: {
          status: 'COMPLETED',
          actualDistanceKm,
          actualArrival: now,
          maxSpeedKmh,
          avgSpeedKmh,
          distanceChargesEtb,
          bonusEtb,
          penaltyEtb,
          totalEarningsEtb,
          completedAt: now,
        },
      }),
      prisma.fmsDriverEarning.create({
        data: {
          id: ulid(),
          driverId: trip.driverId,
          tripId: trip.id,
          distanceKm: actualDistanceKm,
          ratePerKm: trip.baseRatePerKm,
          baseEarning: distanceChargesEtb,
          bonus: bonusEtb,
          penalty: penaltyEtb,
          totalEarning: totalEarningsEtb,
          status: 'PENDING',
        },
      }),
      prisma.fmsDriver.update({
        where: { id: trip.driverId },
        data: {
          totalTrips: { increment: 1 },
          totalEarningsEtb: { increment: totalEarningsEtb },
        },
      }),
    ]);

    // Fire speeding alert if max speed exceeded 110 km/h
    if (maxSpeedKmh > 110) {
      AlertService.createAlert({
        accountId: trip.accountId,
        type: 'SPEEDING',
        severity: maxSpeedKmh > 130 ? 'HIGH' : 'MEDIUM',
        message: `Trip ${trip.id.slice(-6)}: max speed ${maxSpeedKmh} km/h recorded`,
        truckId: trip.truckId,
        driverId: trip.driverId,
        metadata: { maxSpeedKmh, tripId: trip.id },
      }).catch(() => {});
    }

    res.json({
      tripId: trip.id,
      distanceKm: actualDistanceKm,
      durationMinutes: Math.round((now.getTime() - trip.startedAt.getTime()) / 60_000),
      earnings: {
        base: Math.round(distanceChargesEtb * 100) / 100,
        bonus: bonusEtb,
        penalty: penaltyEtb,
        total: Math.round(totalEarningsEtb * 100) / 100,
        currency: 'ETB',
      },
    });
  } catch (err) {
    logger.error('complete_trip_failed', {
      tripId: req.params.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({ error: 'Failed to complete trip' });
  }
}));

// GET /api/trips - list trips for account (dashboard use)
router.get('/', requireUserAuth, validateQuery(tripListQuerySchema), asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  const { status, driverId, truckId, from, to, limit, offset } =
    res.locals.query as z.infer<typeof tripListQuerySchema>;

  const trips = await prisma.fmsTrip.findMany({
    where: {
      accountId: auth.accountId,
      ...(status ? { status } : {}),
      ...(driverId ? { driverId } : {}),
      ...(truckId ? { truckId } : {}),
      ...(from || to
        ? {
            startedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      driver: { select: { id: true, name: true, phone: true } },
      truck: { select: { id: true, licensePlate: true, model: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.json(trips);
}));

// GET /api/trips/active - driver's currently active trip
router.get('/active', requireDriverAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as DriverAuthPayload;

  const trip = await prisma.fmsTrip.findFirst({
    where: { driverId: auth.driverId, status: { in: ['STARTED', 'IN_TRANSIT'] } },
  });

  if (!trip) return res.status(404).json({ active: false });
  res.json({ active: true, trip });
}));

// GET /api/trips/mine - driver's own trip history (driver-authenticated)
router.get('/mine', requireDriverAuth, validateQuery(paginationSchema), asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as DriverAuthPayload;
  const { limit, offset } = res.locals.query as z.infer<typeof paginationSchema>;

  const trips = await prisma.fmsTrip.findMany({
    where: { driverId: auth.driverId },
    include: {
      truck: { select: { id: true, licensePlate: true, model: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.json(trips);
}));

export default router;
