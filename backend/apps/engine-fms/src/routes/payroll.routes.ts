import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateQuery, paginationSchema } from '../middleware/validateQuery';

const router = Router();

const earningInclude = {
  driver: { select: { id: true, name: true } },
  trip: {
    select: {
      id: true,
      originName: true,
      destinationName: true,
      startedAt: true,
      actualDistanceKm: true,
    },
  },
} as const;

// GET /api/payroll/pending
router.get('/pending', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };

  const earnings = await prisma.fmsDriverEarning.findMany({
    where: { status: 'PENDING', driver: { accountId: auth.accountId } },
    include: earningInclude,
    orderBy: { createdAt: 'desc' },
  });

  res.json(earnings);
}));

// GET /api/payroll/approved
router.get('/approved', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };

  const earnings = await prisma.fmsDriverEarning.findMany({
    where: { status: 'APPROVED', driver: { accountId: auth.accountId } },
    include: earningInclude,
    orderBy: { createdAt: 'desc' },
  });

  res.json(earnings);
}));

// GET /api/payroll/history
router.get('/history', requireUserAuth, validateQuery(paginationSchema), asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  const { limit, offset } = res.locals.query as z.infer<typeof paginationSchema>;

  const earnings = await prisma.fmsDriverEarning.findMany({
    where: { status: 'PAID', driver: { accountId: auth.accountId } },
    include: earningInclude,
    orderBy: { paidAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.json(earnings);
}));

// PATCH /api/payroll/:id/approve
router.patch('/:id/approve', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string; role: string };

  if (auth.role !== 'FLEET_OWNER' && auth.role !== 'OPS_ADMIN') {
    return res.status(403).json({ error: 'Only FLEET_OWNER or OPS_ADMIN can approve earnings' });
  }

  const earning = await prisma.fmsDriverEarning.findFirst({
    where: { id: req.params.id, driver: { accountId: auth.accountId } },
  });
  if (!earning) return res.status(404).json({ error: 'Earning not found' });
  if (earning.status !== 'PENDING') return res.status(409).json({ error: 'Only PENDING earnings can be approved' });

  const updated = await prisma.fmsDriverEarning.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED' },
    include: earningInclude,
  });

  res.json(updated);
}));

// PATCH /api/payroll/:id/pay
router.patch('/:id/pay', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const schema = z.object({ paymentRef: z.string().optional() });
  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const auth = req.auth as { accountId: string; role: string };

  if (auth.role !== 'FLEET_OWNER' && auth.role !== 'OPS_ADMIN') {
    return res.status(403).json({ error: 'Only FLEET_OWNER or OPS_ADMIN can mark earnings as paid' });
  }

  const earning = await prisma.fmsDriverEarning.findFirst({
    where: { id: req.params.id, driver: { accountId: auth.accountId } },
  });
  if (!earning) return res.status(404).json({ error: 'Earning not found' });
  if (earning.status !== 'APPROVED') return res.status(409).json({ error: 'Only APPROVED earnings can be marked as paid' });

  const updated = await prisma.fmsDriverEarning.update({
    where: { id: req.params.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paymentRef: body.data.paymentRef ?? null,
    },
    include: earningInclude,
  });

  res.json(updated);
}));

export default router;
