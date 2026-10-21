import { ensureDatabaseDirectory, loadConfig } from '../config.js'
import { openDatabase, runMigrations } from './database.js'

const config = loadConfig()
const reset = process.argv.includes('--reset')

ensureDatabaseDirectory(config.databasePath)
const db = openDatabase(config.databasePath)

if (reset) {
  db.exec(`
    DROP TABLE IF EXISTS short_links;
    DROP TABLE IF EXISTS schema_migrations;
  `)
  console.log(`[linkcraft] reset database at ${config.databasePath}`)
}

const applied = runMigrations(db)
console.log(
  applied > 0
    ? `[linkcraft] applied ${applied} migration(s) to ${config.databasePath}`
    : `[linkcraft] database at ${config.databasePath} is already up to date`,
)

db.close()
