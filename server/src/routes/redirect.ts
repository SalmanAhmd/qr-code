import { Router, type Request, type Response } from 'express'
import type { UrlService } from '../services/url-service.js'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function notFoundPage(code: string): string {
  const safeCode = escapeHtml(code)
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Link not found · LinkCraft</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        background: linear-gradient(160deg, #f8fafc 0%, #eef2ff 55%, #ecfeff 100%);
        color: #0f172a;
        padding: 1.5rem;
      }
      main {
        background: #ffffff;
        border-radius: 1rem;
        box-shadow: 0 20px 45px -25px rgba(15, 23, 42, 0.45);
        padding: 2.5rem;
        max-width: 30rem;
        text-align: center;
        border: 1px solid #e2e8f0;
      }
      h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
      p { margin: 0 0 1.5rem; color: #475569; line-height: 1.6; }
      code { background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 0.375rem; }
      a.button {
        display: inline-block;
        background: #4f46e5;
        color: #ffffff;
        text-decoration: none;
        padding: 0.7rem 1.4rem;
        border-radius: 0.75rem;
        font-weight: 600;
      }
      a.button:hover { background: #4338ca; }
    </style>
  </head>
  <body>
    <main>
      <h1>Short link not found</h1>
      <p>
        The code <code>${safeCode}</code> does not exist. It may have been removed, or the link
        may never have existed.
      </p>
      <a class="button" href="/">Create a new link</a>
    </main>
  </body>
</html>`
}

export function createRedirectRouter(service: UrlService): Router {
  const router = Router()

  router.get('/:code', (req: Request, res: Response) => {
    const rawCode = req.params.code
    const code = Array.isArray(rawCode) ? (rawCode[0] ?? '') : (rawCode ?? '')
    const link = service.findByCode(code)

    if (!link) {
      res.status(404).type('html').send(notFoundPage(code))
      return
    }

    // Defence in depth: never redirect to a non http(s) destination, even if the
    // stored value was tampered with.
    let destination: URL
    try {
      destination = new URL(link.originalUrl)
    } catch {
      res.status(404).type('html').send(notFoundPage(code))
      return
    }
    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
      res.status(404).type('html').send(notFoundPage(code))
      return
    }

    service.recordClick(code)
    res.set('Cache-Control', 'no-store')
    res.redirect(302, link.originalUrl)
  })

  return router
}
