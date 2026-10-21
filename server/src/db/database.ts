import Database from 'better-sqlite3'

export type Db = Database.Database

export interface Migration {
  id: number
  name: string
  up: string
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: 'create_short_links',
    up: `
      CREATE TABLE IF NOT EXISTS short_links (
        code         TEXT PRIMARY KEY,
        original_url TEXT NOT NULL,
        created_at   TEXT NOT NULL,
        clicks       INTEGER NOT NULL DEFAULT 0,
        last_clicked_at TEXT
      );
    `,
  },
  {
    id: 2,
    name: 'index_short_links_created_at',
    up: `
      CREATE INDEX IF NOT EXISTS idx_short_links_created_at
        ON short_links (created_at DESC);
    `,
  },
]

export function openDatabase(filePath: string): Db {
  const db = new Database(filePath)
  if (filePath !== ':memory:') {
    db.pragma('journal_mode = WAL')
  }
  db.pragma('foreign_keys = ON')
  return db
}

/** Applies every pending migration inside a transaction, tracking them in `schema_migrations`. */
export function runMigrations(db: Db): number {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)

  const appliedRows = db.prepare('SELECT id FROM schema_migrations').all() as { id: number }[]
  const applied = new Set(appliedRows.map((row) => row.id))
  const record = db.prepare(
    'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)',
  )

  let count = 0
  for (const migration of migrations) {
    if (applied.has(migration.id)) continue
    db.transaction(() => {
      db.exec(migration.up)
      record.run(migration.id, migration.name, new Date().toISOString())
    })()
    count += 1
  }
  return count
}
