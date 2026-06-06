import { Router, Response } from 'express';
import { z } from 'zod';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateQuery, paginationSchema } from '../middleware/validateQuery';

const router = Router();

const MAINTENANCE_TYPES = ['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_SERVICE', 'FULL_SERVICE', 'OTHER'] as const;

const maintenanceQuerySchema = paginationSchema.extend({
  truckId: z.string().optional(),
  status: z.string().optional(),
});

// GET /api/maintenance
router.get('/', requireUserAuth, validateQuery(maintenanceQuerySchema), asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  const { truckId, status, limit, offset } = res.locals.query as z.infer<typeof maintenanceQuerySchema>;

  const records = await prisma.fmsMaintenanceRecord.findMany({
    where: {
      accountId: auth.accountId,
      ...(truckId ? { truckId } : {}),
      ...(status ? { status } : {}),
    },
    include: { truck: { select: { licensePlate: true, model: true } } },
    orderBy: { scheduledAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.json(records);
}));

// POST /api/maintenance
router.post('/', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({
    truckId: z.string(),
    type: z.enum(MAINTENANCE_TYPES),
    scheduledAt: z.string(),
    completedAt: z.string().optional(),
    costEtb: z.number().positive().optional(),
    mileageKm: z.number().int().positive().optional(),
    notes: z.string().optional(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };

  const truck = await prisma.fmsTruck.findFirst({
    where: { id: body.data.truckId, accountId: auth.accountId },
  });
  if (!truck) return res.status(404).json({ error: 'Truck not found' });

  const record = await prisma.fmsMaintenanceRecord.create({
    data: {
      id: ulid(),
      accountId: auth.accountId,
      truckId: body.data.truckId,
      type: body.data.type,
      scheduledAt: new Date(body.data.scheduledAt),
      completedAt: body.data.completedAt ? new Date(body.data.completedAt) : null,
      costEtb: body.data.costEtb ?? null,
      mileageKm: body.data.mileageKm ?? null,
      notes: body.data.notes ?? null,
      status: body.data.completedAt ? 'COMPLETED' : 'SCHEDULED',
    },
    include: { truck: { select: { licensePlate: true, model: true } } },
  });

  res.status(201).json(record);
}));

// PATCH /api/maintenance/:id
router.patch('/:id', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({
    status: z.enum(['SCHEDULED', 'COMPLETED', 'OVERDUE']).optional(),
    completedAt: z.string().optional(),
    costEtb: z.number().positive().optional(),
    mileageKm: z.number().int().positive().optional(),
    notes: z.string().optional(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };

  const existing = await prisma.fmsMaintenanceRecord.findFirst({
    where: { id: req.params.id, accountId: auth.accountId },
  });
  if (!existing) return res.status(404).json({ error: 'Maintenance record not found' });

  const updated = await prisma.fmsMaintenanceRecord.update({
    where: { id: req.params.id },
    data: {
      ...(body.data.status ? { status: body.data.status } : {}),
      ...(body.data.completedAt ? { completedAt: new Date(body.data.completedAt) } : {}),
      ...(body.data.costEtb !== undefined ? { costEtb: body.data.costEtb } : {}),
      ...(body.data.mileageKm !== undefined ? { mileageKm: body.data.mileageKm } : {}),
      ...(body.data.notes !== undefined ? { notes: body.data.notes } : {}),
    },
    include: { truck: { select: { licensePlate: true, model: true } } },
  });

  res.json(updated);
}));

export default router;
