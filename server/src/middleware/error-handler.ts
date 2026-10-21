import type { NextFunction, Request, Response } from 'express'

export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

/** 404 handler for unknown `/api/*` routes. */
export function apiNotFound(_req: Request, res: Response): void {
  const body: ApiErrorBody = {
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist.',
    },
  }
  res.status(404).json(body)
}

/** Central error handler: never leaks internals to the client. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error)
    return
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const message = error instanceof Error ? error.message : 'Unexpected error'

  if (!isProduction) {
    console.error('[linkcraft] unhandled error:', error)
  }

  const body: ApiErrorBody = {
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'Something went wrong while processing the request.'
        : message,
    },
  }
  res.status(500).json(body)
}
