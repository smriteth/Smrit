import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import { prisma } from '@smrit/shared-db';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// POST /api/admin/accounts — create a new customer account + first admin user
router.post('/accounts', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string; role: string };

  if (auth.role !== 'OPS_ADMIN') {
    return res.status(403).json({ error: 'Only OPS_ADMIN can create accounts' });
  }

  const schema = z.object({
    name: z.string().min(2),
    contactEmail: z.string().email(),
    contactPhone: z.string(),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8),
  });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const existingUser = await prisma.fmsUser.findUnique({
    where: { email: body.data.adminEmail },
  });
  if (existingUser) return res.status(409).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(body.data.adminPassword, 10);
  const accountId = ulid();
  const userId = ulid();

  const [account, user] = await prisma.$transaction([
    prisma.fmsAccount.create({
      data: {
        id: accountId,
        name: body.data.name,
        contactEmail: body.data.contactEmail,
        contactPhone: body.data.contactPhone,
      },
    }),
    prisma.fmsUser.create({
      data: {
        id: userId,
        accountId,
        email: body.data.adminEmail,
        passwordHash,
        role: 'FLEET_OWNER',
      },
    }),
  ]);

  res.status(201).json({
    account: {
      id: account.id,
      name: account.name,
      contactEmail: account.contactEmail,
    },
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}));

// GET /api/admin/accounts — list all accounts
router.get('/accounts', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { role: string };

  if (auth.role !== 'OPS_ADMIN') {
    return res.status(403).json({ error: 'Only OPS_ADMIN can list accounts' });
  }

  const accounts = await prisma.fmsAccount.findMany({
    include: { _count: { select: { trucks: true, drivers: true, trips: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json(accounts);
}));

export default router;
