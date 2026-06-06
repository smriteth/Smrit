import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@smrit/shared-db';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// POST /api/auth/login — dashboard user login
router.post('/auth/login', asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string(),
  });
  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });

  const user = await prisma.fmsUser.findUnique({ where: { email: body.data.email } });
  if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user.id, accountId: user.accountId, role: user.role, type: 'user' },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' },
  );

  res.json({ token, userId: user.id, accountId: user.accountId, role: user.role });
}));

// POST /api/auth/driver/login — driver mobile app login
router.post('/auth/driver/login', asyncHandler(async (req, res) => {
  const schema = z.object({
    phone: z.string(),
    password: z.string(),
  });
  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });

  const driver = await prisma.fmsDriver.findUnique({
    where: { phone: body.data.phone },
    include: { assignedTruck: true },
  });
  if (!driver || driver.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Invalid credentials or account suspended' });
  }

  const valid = await bcrypt.compare(body.data.password, driver.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  if (!driver.assignedTruck) {
    return res.status(403).json({ error: 'No truck assigned to this driver' });
  }

  const token = jwt.sign(
    {
      driverId: driver.id,
      accountId: driver.accountId,
      truckId: driver.assignedTruck.id,
      traccarDeviceId: driver.assignedTruck.traccarDeviceId,
      traccarUniqueId: driver.assignedTruck.traccarUniqueId,
      type: 'driver',
    },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' },
  );

  res.json({
    token,
    driver: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
    },
    truck: {
      id: driver.assignedTruck.id,
      name: driver.assignedTruck.model,
      licensePlate: driver.assignedTruck.licensePlate,
      traccarUniqueId: driver.assignedTruck.traccarUniqueId,
    },
  });
}));

export default router;
