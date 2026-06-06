import { Router, Response } from 'express';
import { z } from 'zod';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateQuery, paginationSchema } from '../middleware/validateQuery';

const router = Router();

const GeoPointSchema = z.object({ lat: z.number(), lng: z.number() });

// GET /api/geofences/events — must precede /:id
router.get('/events', requireUserAuth, validateQuery(paginationSchema), asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  const { limit, offset } = res.locals.query as z.infer<typeof paginationSchema>;

  const events = await prisma.fmsGeofenceEvent.findMany({
    where: { geofence: { accountId: auth.accountId } },
    include: {
      truck: { select: { licensePlate: true } },
      geofence: { select: { name: true, type: true } },
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.json(events);
}));

// GET /api/geofences
router.get('/', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };

  const geofences = await prisma.fmsGeofence.findMany({
    where: { accountId: auth.accountId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(geofences);
}));

// POST /api/geofences
router.post('/', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(['RESTRICTED', 'ALLOWED', 'ALERT']).default('ALERT'),
    polygon: z.array(GeoPointSchema).min(3),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };

  const geofence = await prisma.fmsGeofence.create({
    data: {
      id: ulid(),
      accountId: auth.accountId,
      name: body.data.name,
      description: body.data.description ?? null,
      type: body.data.type,
      polygon: body.data.polygon,
      isActive: true,
    },
  });

  res.status(201).json(geofence);
}));

// PATCH /api/geofences/:id
router.patch('/:id', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    type: z.enum(['RESTRICTED', 'ALLOWED', 'ALERT']).optional(),
    isActive: z.boolean().optional(),
    polygon: z.array(GeoPointSchema).min(3).optional(),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string };

  const existing = await prisma.fmsGeofence.findFirst({
    where: { id: req.params.id, accountId: auth.accountId },
  });
  if (!existing) return res.status(404).json({ error: 'Geofence not found' });

  const updated = await prisma.fmsGeofence.update({
    where: { id: req.params.id },
    data: body.data,
  });

  res.json(updated);
}));

// DELETE /api/geofences/:id
router.delete('/:id', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };

  const existing = await prisma.fmsGeofence.findFirst({
    where: { id: req.params.id, accountId: auth.accountId },
  });
  if (!existing) return res.status(404).json({ error: 'Geofence not found' });

  await prisma.fmsGeofence.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

export default router;
