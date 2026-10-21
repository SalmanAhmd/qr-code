import { Router, type Request, type Response } from 'express'
import type { UrlService } from '../services/url-service.js'
import { validateDestinationUrl } from '../services/url-service.js'
import type { AppConfig } from '../config.js'
import { createRateLimiter } from '../middleware/rate-limit.js'

export interface ShortenResponseBody {
  originalUrl: string
  shortUrl: string
  code: string
  createdAt: string
  clicks: number
  reused: boolean
}

export function createShortenRouter(service: UrlService, config: AppConfig): Router {
  const router = Router()
  const shortenLimiter = createRateLimiter({
    windowMs: config.shortenRateLimit.windowMs,
    max: config.shortenRateLimit.max,
    message: 'You have created a lot of links recently. Please try again in a few minutes.',
  })

  router.post('/shorten', shortenLimiter, (req: Request, res: Response) => {
    const body = req.body as unknown

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      res.status(400).json({
        error: { code: 'INVALID_BODY', message: 'The request body must be a JSON object.' },
      })
      return
    }

    const { url } = body as { url?: unknown }
    const validation = validateDestinationUrl(url, {
      blockPrivateDestinations: config.blockPrivateDestinations,
      baseUrl: config.baseUrl,
    })

    if (!validation.ok) {
      res.status(400).json({ error: { code: validation.code, message: validation.message } })
      return
    }

    try {
      const { link, reused } = service.create(validation.url)
      const responseBody: ShortenResponseBody = {
        originalUrl: link.originalUrl,
        shortUrl: link.shortUrl,
        code: link.code,
        createdAt: link.createdAt,
        clicks: link.clicks,
        reused,
      }
      res.status(reused ? 200 : 201).json(responseBody)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(503).json({
        error: {
          code: 'STORAGE_ERROR',
          message: `The link could not be stored right now: ${message}`,
        },
      })
    }
  })

  return router
}
