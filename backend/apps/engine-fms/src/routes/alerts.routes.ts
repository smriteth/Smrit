import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { AlertService } from '../services/alert.service';
import { asyncHandler } from '../utils/asyncHandler';
import { validateQuery, paginationSchema } from '../middleware/validateQuery';

const router = Router();

const alertQuerySchema = paginationSchema.extend({
  isRead: z.enum(['true', 'false']).optional(),
  type: z.string().optional(),
  severity: z.string().optional(),
});

// GET /api/alerts/unread-count — must precede /:id
router.get(
  '/unread-count',
  requireUserAuth,
  asyncHandler<AuthRequest>(async (req, res) => {
    const auth = req.auth as { accountId: string };
    const count = await prisma.fmsAlert.count({ where: { accountId: auth.accountId, isRead: false } });
    res.json({ count });
  }),
);

// PATCH /api/alerts/read-all — must precede /:id
router.patch(
  '/read-all',
  requireUserAuth,
  asyncHandler<AuthRequest>(async (req, res) => {
    const auth = req.auth as { accountId: string };
    await prisma.fmsAlert.updateMany({
      where: { accountId: auth.accountId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  }),
);

// GET /api/alerts — also runs expiry check on each fetch
router.get(
  '/',
  requireUserAuth,
  validateQuery(alertQuerySchema),
  asyncHandler<AuthRequest>(async (req, res) => {
    const auth = req.auth as { accountId: string };
    const { isRead, type, severity, limit, offset } = res.locals.query as z.infer<typeof alertQuerySchema>;

    // Run background expiry check (non-blocking)
    AlertService.checkAndCreateExpiryAlerts(auth.accountId).catch(() => {});

    const alerts = await prisma.fmsAlert.findMany({
      where: {
        accountId: auth.accountId,
        ...(isRead !== undefined ? { isRead: isRead === 'true' } : {}),
        ...(type ? { type } : {}),
        ...(severity ? { severity } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Batch-load truck/driver names (avoids N+1: two queries instead of 2 per row).
    const truckIds = [...new Set(alerts.map((a) => a.truckId).filter((id): id is string => !!id))];
    const driverIds = [...new Set(alerts.map((a) => a.driverId).filter((id): id is string => !!id))];

    const [trucks, drivers] = await Promise.all([
      truckIds.length
        ? prisma.fmsTruck.findMany({ where: { id: { in: truckIds } }, select: { id: true, licensePlate: true } })
        : Promise.resolve([]),
      driverIds.length
        ? prisma.fmsDriver.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);

    const truckMap = new Map(trucks.map((t) => [t.id, { licensePlate: t.licensePlate }]));
    const driverMap = new Map(drivers.map((d) => [d.id, { name: d.name }]));

    const enriched = alerts.map((alert) => ({
      ...alert,
      truck: alert.truckId ? truckMap.get(alert.truckId) ?? null : null,
      driver: alert.driverId ? driverMap.get(alert.driverId) ?? null : null,
    }));

    res.json(enriched);
  }),
);

// PATCH /api/alerts/:id/read
router.patch(
  '/:id/read',
  requireUserAuth,
  asyncHandler<AuthRequest>(async (req, res) => {
    const auth = req.auth as { accountId: string };

    const alert = await prisma.fmsAlert.findFirst({
      where: { id: req.params.id, accountId: auth.accountId },
    });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    await prisma.fmsAlert.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ success: true });
  }),
);

export default router;
