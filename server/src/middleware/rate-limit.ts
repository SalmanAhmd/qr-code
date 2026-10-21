import type { Request, Response } from 'express'
import rateLimit, { type Options } from 'express-rate-limit'

export interface RateLimiterOptions {
  windowMs: number
  max: number
  message?: string
}

const DEFAULT_MESSAGE = 'Too many requests. Please slow down and try again shortly.'

/** Rate limiter that answers with a JSON error payload so the client can react to it. */
export function createRateLimiter(options: RateLimiterOptions) {
  const limiterOptions: Partial<Options> = {
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: options.message ?? DEFAULT_MESSAGE,
        },
      })
    },
  }
  return rateLimit(limiterOptions)
}
