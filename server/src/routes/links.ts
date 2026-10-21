import { Router, type Request, type Response } from 'express'
import type { UrlService } from '../services/url-service.js'

export interface LinkResponseBody {
  code: string
  originalUrl: string
  shortUrl: string
  createdAt: string
  clicks: number
  lastClickedAt: string | null
}

export function createLinksRouter(service: UrlService): Router {
  const router = Router()

  router.get('/links', (req: Request, res: Response) => {
    const requested = Number.parseInt(String(req.query.limit ?? '25'), 10)
    const limit = Number.isFinite(requested) ? requested : 25
    const links: LinkResponseBody[] = service.listRecent(limit).map((link) => ({
      code: link.code,
      originalUrl: link.originalUrl,
      shortUrl: link.shortUrl,
      createdAt: link.createdAt,
      clicks: link.clicks,
      lastClickedAt: link.lastClickedAt,
    }))
    res.json({ links })
  })

  router.get('/links/:code', (req: Request, res: Response) => {
    const rawCode = req.params.code
    const code = Array.isArray(rawCode) ? (rawCode[0] ?? '') : (rawCode ?? '')
    const link = service.findByCode(code)
    if (!link) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'No short link exists for that code.' },
      })
      return
    }
    const body: LinkResponseBody = {
      code: link.code,
      originalUrl: link.originalUrl,
      shortUrl: link.shortUrl,
      createdAt: link.createdAt,
      clicks: link.clicks,
      lastClickedAt: link.lastClickedAt,
    }
    res.json(body)
  })

  return router
}
