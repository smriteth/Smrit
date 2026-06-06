import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so a rejected promise is forwarded to Express'
 * error-handling middleware instead of becoming an unhandled rejection (which, on
 * Node 15+, terminates the process). Keeps the API resilient to unexpected DB /
 * Traccar failures inside handlers.
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
}
