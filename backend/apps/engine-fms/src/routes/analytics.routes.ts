import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireUserAuth } from '../middleware/auth.middleware';
import { AnalyticsService } from '../services/analytics.service';
import { asyncHandler } from '../utils/asyncHandler';
import { validateQuery, dateRangeSchema } from '../middleware/validateQuery';
import { logger } from '../utils/logger';

const router = Router();

const DEFAULT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function rangeFromLocals(res: { locals: { query?: z.infer<typeof dateRangeSchema> } }) {
  const q = res.locals.query ?? {};
  return {
    from: q.from ?? new Date(Date.now() - DEFAULT_WINDOW_MS),
    to: q.to ?? new Date(),
  };
}

// GET /api/analytics/overview
router.get('/overview', requireUserAuth, asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  try {
    res.json(await AnalyticsService.getOverview(auth.accountId));
  } catch (err) {
    logger.error('analytics_overview_failed', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
}));

// GET /api/analytics/trips
router.get('/trips', requireUserAuth, validateQuery(dateRangeSchema), asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  const { from, to } = rangeFromLocals(res);
  try {
    res.json(await AnalyticsService.getTripAnalytics(auth.accountId, from, to));
  } catch (err) {
    logger.error('analytics_trips_failed', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Failed to compute trip analytics' });
  }
}));

// GET /api/analytics/drivers
router.get('/drivers', requireUserAuth, validateQuery(dateRangeSchema), asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  const { from, to } = rangeFromLocals(res);
  try {
    res.json(await AnalyticsService.getDriverRankings(auth.accountId, from, to));
  } catch (err) {
    logger.error('analytics_drivers_failed', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Failed to compute driver analytics' });
  }
}));

// GET /api/analytics/costs
router.get('/costs', requireUserAuth, validateQuery(dateRangeSchema), asyncHandler<AuthRequest>(async (req, res) => {
  const auth = req.auth as { accountId: string };
  const { from, to } = rangeFromLocals(res);
  try {
    res.json(await AnalyticsService.getCostBreakdown(auth.accountId, from, to));
  } catch (err) {
    logger.error('analytics_costs_failed', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Failed to compute cost analytics' });
  }
}));

export default router;
