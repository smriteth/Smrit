import { Router, Response } from 'express';
import { z } from 'zod';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth, requireAnyAuth, DriverAuthPayload } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateQuery, paginationSchema } from '../middleware/validateQuery';

const router = Router();

const ChecklistItemSchema = z.object({
  item: z.string(),
  passed: z.boolean(),
  notes: z.string().optional(),
});

const inspectionQuerySchema = paginationSchema.extend({
  truckId: z.string().optional(),
  type: z.string().optional(),
});

// GET /api/inspections
router.get(
  '/',
  requireUserAuth,
  validateQuery(inspectionQuerySchema),
  asyncHandler<AuthRequest>(async (req, res) => {
    const auth = req.auth as { accountId: string };
    const { truckId, type, limit, offset } = res.locals.query as z.infer<typeof inspectionQuerySchema>;

    const inspections = await prisma.fmsInspection.findMany({
      where: {
        accountId: auth.accountId,
        ...(truckId ? { truckId } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        truck: { select: { licensePlate: true } },
        driver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    res.json(inspections);
  }),
);

// POST /api/inspections — accepts both driver and user auth
router.post(
  '/',
  requireAnyAuth,
  asyncHandler<AuthRequest>(async (req, res) => {
    const auth = req.auth!;
    const accountId = auth.accountId;

    let driverId: string;
    if (auth.type === 'driver') {
      driverId = (auth as DriverAuthPayload).driverId;
    } else {
      // Manager creating inspection — driverId must come from body
      driverId = req.body.driverId;
      if (!driverId) {
        return res.status(400).json({ error: 'driverId required for user-created inspections' });
      }
    }

    const schema = z.object({
      truckId: z.string(),
      driverId: z.string().optional(),
      tripId: z.string().optional(),
      type: z.enum(['PRE_TRIP', 'POST_TRIP']),
      checklist: z.array(ChecklistItemSchema).min(1),
      notes: z.string().optional(),
    });

    const body = schema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.flatten() });

    const truck = await prisma.fmsTruck.findFirst({
      where: { id: body.data.truckId, accountId },
    });
    if (!truck) return res.status(404).json({ error: 'Truck not found' });

    const allPassed = body.data.checklist.every((item) => item.passed);
    const status = allPassed ? 'PASSED' : 'FAILED';

    const inspection = await prisma.fmsInspection.create({
      data: {
        id: ulid(),
        accountId,
        truckId: body.data.truckId,
        driverId,
        tripId: body.data.tripId ?? null,
        type: body.data.type,
        checklist: body.data.checklist,
        status,
        notes: body.data.notes ?? null,
        completedAt: new Date(),
      },
      include: {
        truck: { select: { licensePlate: true } },
      },
    });

    res.status(201).json(inspection);
  }),
);

export default router;
