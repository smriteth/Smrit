import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  accountId: string;
  role: string;
  type: 'user';
}

export interface DriverAuthPayload {
  driverId: string;
  accountId: string;
  truckId: string;
  traccarDeviceId: number;
  traccarUniqueId: string;
  type: 'driver';
}

export interface AuthRequest extends Request {
  auth?: AuthPayload | DriverAuthPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload | DriverAuthPayload;
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireUserAuth(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.type !== 'user') {
      return res.status(403).json({ error: 'User authentication required' });
    }
    next();
  });
}

export function requireDriverAuth(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.type !== 'driver') {
      return res.status(403).json({ error: 'Driver authentication required' });
    }
    next();
  });
}

/** Accepts either a user or a driver token. Use when an endpoint serves both roles. */
export function requireAnyAuth(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.type !== 'user' && req.auth?.type !== 'driver') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    next();
  });
}
