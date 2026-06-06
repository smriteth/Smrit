import { Request, Response, NextFunction } from 'express';
import { z, ZodTypeAny } from 'zod';

/**
 * Middleware factory that validates `req.query` against a Zod schema. The parsed +
 * coerced result is stored on `res.locals.query` (we never mutate `req.query`).
 * Unknown query keys are stripped; invalid values produce a 400 instead of leaking
 * into Prisma/Date parsing and causing crashes or unbounded queries.
 */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    res.locals.query = parsed.data;
    next();
  };
}

/** limit: 1..200 (default 50); offset: >=0 (default 0). Caps unbounded list queries. */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Optional ISO date range. Rejects un-parseable dates with a 400. */
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
