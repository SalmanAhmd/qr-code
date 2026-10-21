import { createApp } from './app.js'
import { ensureDatabaseDirectory, loadConfig } from './config.js'
import { openDatabase, runMigrations } from './db/database.js'

const config = loadConfig()

ensureDatabaseDirectory(config.databasePath)
const db = openDatabase(config.databasePath)
const applied = runMigrations(db)

if (applied > 0) {
  console.log(`[linkcraft] applied ${applied} database migration(s)`)
}

const app = createApp({ db, config })

const server = app.listen(config.port, () => {
  console.log(`[linkcraft] server listening on http://localhost:${config.port}`)
  console.log(`[linkcraft] public base url: ${config.baseUrl}`)
  console.log(`[linkcraft] database: ${config.databasePath}`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[linkcraft] port ${config.port} is already in use. Set PORT to a free port and try again.`,
    )
    process.exit(1)
  }
  throw error
})

function shutdown(signal: string): void {
  console.log(`[linkcraft] received ${signal}, shutting down`)
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
