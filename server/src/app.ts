import fs from 'node:fs'
import path from 'node:path'
import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import type { AppConfig } from './config.js'
import type { Db } from './db/database.js'
import { createRateLimiter } from './middleware/rate-limit.js'
import { apiNotFound, errorHandler } from './middleware/error-handler.js'
import { createLinksRouter } from './routes/links.js'
import { createRedirectRouter } from './routes/redirect.js'
import { createShortenRouter } from './routes/shorten.js'
import { UrlService } from './services/url-service.js'

export interface CreateAppOptions {
  db: Db
  config: AppConfig
}

export function createApp({ db, config }: CreateAppOptions): Express {
  const app = express()
  const service = new UrlService(db, {
    baseUrl: config.baseUrl,
    blockPrivateDestinations: config.blockPrivateDestinations,
  })

  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // Inline styles are required by React style attributes; Google Fonts
          // provides the Inter stylesheet and its font files.
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  )

  app.use(
    cors({
      origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
      credentials: false,
      methods: ['GET', 'POST', 'OPTIONS'],
    }),
  )

  app.use(express.json({ limit: '16kb' }))
  app.use(createRateLimiter(config.rateLimit))

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) })
  })

  const api = express.Router()
  api.use(createShortenRouter(service, config))
  api.use(createLinksRouter(service))
  app.use('/api', api)

  // Unknown API routes always answer with JSON, never with the redirect handler.
  app.use('/api', apiNotFound)

  // Serve the built single page app when running in production mode.
  if (config.serveClient && fs.existsSync(config.clientDistPath)) {
    app.use(express.static(config.clientDistPath, { index: false, maxAge: '1h' }))
    app.get('/', (_req, res) => {
      res.sendFile(path.join(config.clientDistPath, 'index.html'))
    })
  }

  // Short link redirects: GET /:code
  app.use(createRedirectRouter(service))

  app.use(errorHandler)

  return app
}
