import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(serverRoot, '..')

// Load env files without overriding values that are already set in the environment.
// Local overrides win over the repo-root file so each workspace can be tuned separately.
dotenv.config({ path: [path.join(serverRoot, '.env'), path.join(repoRoot, '.env')], override: false })

export type NodeEnv = 'development' | 'production' | 'test'

export interface AppConfig {
  nodeEnv: NodeEnv
  port: number
  baseUrl: string
  databasePath: string
  corsOrigins: string[]
  trustProxy: boolean | number | string
  serveClient: boolean
  clientDistPath: string
  rateLimit: {
    windowMs: number
    max: number
  }
  shortenRateLimit: {
    windowMs: number
    max: number
  }
  blockPrivateDestinations: boolean
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length > 0 ? items : fallback
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = (env.NODE_ENV as NodeEnv) ?? 'development'
  const port = parseNumber(env.PORT, 4000)
  const isProduction = nodeEnv === 'production'

  const baseUrl = normalizeBaseUrl(env.BASE_URL?.trim() || `http://localhost:${port}`)
  const databasePath = path.resolve(serverRoot, env.DATABASE_PATH?.trim() || 'data/linkcraft.db')

  const trustProxyRaw = env.TRUST_PROXY?.trim()
  const trustProxy: boolean | number | string =
    trustProxyRaw === undefined || trustProxyRaw === ''
      ? false
      : /^\d+$/.test(trustProxyRaw)
        ? Number(trustProxyRaw)
        : trustProxyRaw.toLowerCase() === 'true'
          ? true
          : trustProxyRaw.toLowerCase() === 'false'
            ? false
            : trustProxyRaw

  return {
    nodeEnv,
    port,
    baseUrl,
    databasePath,
    corsOrigins: parseList(env.CORS_ORIGIN, isProduction ? [] : ['*']),
    trustProxy,
    serveClient: parseBoolean(env.SERVE_CLIENT, isProduction),
    clientDistPath: path.resolve(repoRoot, env.CLIENT_DIST_PATH?.trim() || 'client/dist'),
    rateLimit: {
      windowMs: parseNumber(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      max: parseNumber(env.RATE_LIMIT_MAX, 300),
    },
    shortenRateLimit: {
      windowMs: parseNumber(env.SHORTEN_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
      max: parseNumber(env.SHORTEN_RATE_LIMIT_MAX, 30),
    },
    blockPrivateDestinations: parseBoolean(env.BLOCK_PRIVATE_DESTINATIONS, isProduction),
  }
}

/** Creates the parent directory of a SQLite file if it does not exist yet. */
export function ensureDatabaseDirectory(databasePath: string): void {
  if (databasePath === ':memory:') return
  fs.mkdirSync(path.dirname(databasePath), { recursive: true })
}
