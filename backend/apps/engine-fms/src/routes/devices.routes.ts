import { Router, Response } from 'express';
import { z } from 'zod';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateQuery } from '../middleware/validateQuery';
import { getTraccarServiceInstance } from '../runtime';

const router = Router();

// from/to are required and must be valid ISO dates for the history endpoint.
const historyQuerySchema = z.object({
  from: z.coerce.date({ required_error: 'from is required', invalid_type_error: 'from must be a valid ISO 8601 date' }),
  to: z.coerce.date({ required_error: 'to is required', invalid_type_error: 'to must be a valid ISO 8601 date' }),
});

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function expiryStatus(date: Date | null): 'OK' | 'EXPIRING_SOON' | 'EXPIRED' {
  if (!date) return 'OK';
  const now = Date.now();
  if (date.getTime() < now) return 'EXPIRED';
  if (date.getTime() - now < THIRTY_DAYS) return 'EXPIRING_SOON';
  return 'OK';
}

// GET /api/devices - list trucks with latest positions
router.get('/', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };

  const trucks = await prisma.fmsTruck.findMany({
    where: { accountId: auth.accountId },
    include: { activeDriver: true },
  });

  let latestPositions: Record<number, { lat: number; lng: number; speed: number; fixTime: string }> = {};
  try {
    const positions = await getTraccarServiceInstance().getLatestPositions();
    for (const pos of positions) {
      latestPositions[pos.deviceId] = {
        lat: pos.latitude,
        lng: pos.longitude,
        speed: Math.round(pos.speed * 1.852),
        fixTime: pos.fixTime,
      };
    }
  } catch {
    // Traccar unavailable - return trucks without positions
  }

  const result = trucks.map((truck) => ({
    id: truck.id,
    licensePlate: truck.licensePlate,
    model: truck.model,
    year: truck.year,
    fuelType: truck.fuelType,
    status: truck.status,
    odometerKm: truck.odometerKm,
    insuranceExpiry: truck.insuranceExpiry,
    registrationExpiry: truck.registrationExpiry,
    nextServiceKm: truck.nextServiceKm,
    insuranceStatus: expiryStatus(truck.insuranceExpiry),
    registrationStatus: expiryStatus(truck.registrationExpiry),
    driver: truck.activeDriver
      ? { id: truck.activeDriver.id, name: truck.activeDriver.name }
      : null,
    position: truck.traccarDeviceId ? latestPositions[truck.traccarDeviceId] ?? null : null,
    traccarUniqueId: truck.traccarUniqueId,
  }));

  res.json(result);
}));

// POST /api/devices - register a truck
router.post('/', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({
    licensePlate: z.string(),
    model: z.string(),
    year: z.number().int(),
    capacityKg: z.number().int(),
    fuelType: z.enum(['DIESEL', 'PETROL', 'CNG']).optional().default('DIESEL'),
    insuranceExpiry: z.string().optional(),
    registrationExpiry: z.string().optional(),
    odometerKm: z.number().int().nonnegative().optional().default(0),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };
  const traccarUniqueId = `SMRIT_${ulid()}`;

  let traccarDeviceId: number | null = null;
  try {
    const traccarDevice = await getTraccarServiceInstance().createDevice(
      body.data.licensePlate,
      traccarUniqueId,
    );
    traccarDeviceId = traccarDevice.id;
  } catch {
    return res.status(500).json({ error: 'Failed to register GPS device' });
  }

  const truck = await prisma.fmsTruck.create({
    data: {
      id: ulid(),
      accountId: auth.accountId,
      traccarDeviceId,
      traccarUniqueId,
      licensePlate: body.data.licensePlate,
      model: body.data.model,
      year: body.data.year,
      capacityKg: body.data.capacityKg,
      fuelType: body.data.fuelType,
      odometerKm: body.data.odometerKm,
      insuranceExpiry: body.data.insuranceExpiry ? new Date(body.data.insuranceExpiry) : null,
      registrationExpiry: body.data.registrationExpiry ? new Date(body.data.registrationExpiry) : null,
    },
  });

  res.status(201).json(truck);
}));

// PATCH /api/devices/:id - update truck fields
router.patch('/:id', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({
    status: z.enum(['ACTIVE', 'MAINTENANCE', 'RETIRED']).optional(),
    odometerKm: z.number().int().nonnegative().optional(),
    insuranceExpiry: z.string().optional(),
    registrationExpiry: z.string().optional(),
    nextServiceKm: z.number().int().positive().optional(),
    fuelType: z.enum(['DIESEL', 'PETROL', 'CNG']).optional(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };

  const truck = await prisma.fmsTruck.findFirst({
    where: { id: req.params.id, accountId: auth.accountId },
  });
  if (!truck) return res.status(404).json({ error: 'Truck not found' });

  const updated = await prisma.fmsTruck.update({
    where: { id: req.params.id },
    data: {
      ...(body.data.status ? { status: body.data.status } : {}),
      ...(body.data.odometerKm !== undefined ? { odometerKm: body.data.odometerKm } : {}),
      ...(body.data.insuranceExpiry ? { insuranceExpiry: new Date(body.data.insuranceExpiry) } : {}),
      ...(body.data.registrationExpiry ? { registrationExpiry: new Date(body.data.registrationExpiry) } : {}),
      ...(body.data.nextServiceKm !== undefined ? { nextServiceKm: body.data.nextServiceKm } : {}),
      ...(body.data.fuelType ? { fuelType: body.data.fuelType } : {}),
    },
  });

  res.json(updated);
}));

// GET /api/devices/:id/history
router.get('/:id/history', requireUserAuth, validateQuery(historyQuerySchema), asyncHandler<AuthRequest>(async (req, res) => {
  const { from, to } = res.locals.query as z.infer<typeof historyQuerySchema>;

  const auth = req.auth as { accountId: string };
  const truck = await prisma.fmsTruck.findFirst({
    where: { id: req.params.id, accountId: auth.accountId },
  });
  if (!truck?.traccarDeviceId) return res.status(404).json({ error: 'Truck not found or no GPS device' });

  try {
    const positions = await getTraccarServiceInstance().getPositions(
      truck.traccarDeviceId,
      from,
      to,
    );

    res.json({
      truckId: truck.id,
      licensePlate: truck.licensePlate,
      positions: positions.map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
        speed: Math.round(p.speed * 1.852),
        fixTime: p.fixTime,
      })),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve position history' });
  }
}));

export default router;
