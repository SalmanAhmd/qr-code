import type { Express } from 'express'
import { createApp } from '../src/app.js'
import type { AppConfig } from '../src/config.js'
import { openDatabase, runMigrations, type Db } from '../src/db/database.js'

export function baseTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    port: 0,
    baseUrl: 'https://links.test',
    databasePath: ':memory:',
    corsOrigins: ['*'],
    trustProxy: false,
    serveClient: false,
    clientDistPath: '/tmp/linkcraft-no-client',
    rateLimit: { windowMs: 60_000, max: 10_000 },
    shortenRateLimit: { windowMs: 60_000, max: 10_000 },
    blockPrivateDestinations: false,
    ...overrides,
  }
}

export interface TestContext {
  app: Express
  db: Db
  config: AppConfig
}

export function createTestApp(overrides: Partial<AppConfig> = {}): TestContext {
  const config = baseTestConfig(overrides)
  const db = openDatabase(':memory:')
  runMigrations(db)
  const app = createApp({ db, config })
  return { app, db, config }
}
