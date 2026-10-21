import type { Db } from '../db/database.js'
import { DEFAULT_CODE_LENGTH, generateCode, isReservedCode } from './code-generator.js'

export const MAX_URL_LENGTH = 2048

export interface DestinationValidationSuccess {
  ok: true
  url: string
  hostname: string
}

export interface DestinationValidationFailure {
  ok: false
  code: 'INVALID_URL' | 'UNSUPPORTED_PROTOCOL' | 'BLOCKED_DESTINATION' | 'URL_TOO_LONG' | 'INVALID_HOST'
  message: string
}

export type DestinationValidationResult =
  | DestinationValidationSuccess
  | DestinationValidationFailure

export interface UrlServiceOptions {
  baseUrl: string
  blockPrivateDestinations?: boolean
  codeLength?: number
  maxCodeAttempts?: number
}

export interface ShortLink {
  code: string
  originalUrl: string
  shortUrl: string
  createdAt: string
  clicks: number
  lastClickedAt: string | null
}

interface ShortLinkRow {
  code: string
  original_url: string
  created_at: string
  clicks: number
  last_clicked_at: string | null
}

const LOOPBACK_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::', '::1', 'metadata.google.internal'])

/** Detects hosts that point back at the machine or a private network (SSRF / open-redirect guard). */
export function isPrivateHostname(rawHostname: string): boolean {
  const hostname = rawHostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '')

  if (LOOPBACK_HOSTNAMES.has(hostname)) return true
  if (hostname.endsWith('.localhost')) return true
  if (hostname.endsWith('.local')) return true
  if (hostname.endsWith('.internal')) return true

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a >= 224) return true
    return false
  }

  // IPv6 unique local addresses (fc00::/7).
  if (/^f[cd][0-9a-f]{2}:/.test(hostname)) return true

  return false
}

/**
 * Validates a destination URL that the server is willing to redirect to.
 * Only absolute http(s) URLs with a real host are accepted.
 */
export function validateDestinationUrl(
  input: unknown,
  options: { blockPrivateDestinations?: boolean; baseUrl?: string } = {},
): DestinationValidationResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, code: 'INVALID_URL', message: 'A "url" field is required.' }
  }

  const trimmed = input.trim()
  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      code: 'URL_TOO_LONG',
      message: `The URL must be ${MAX_URL_LENGTH} characters or fewer.`,
    }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return {
      ok: false,
      code: 'INVALID_URL',
      message: 'That does not look like a valid URL. Include http:// or https://.',
    }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      code: 'UNSUPPORTED_PROTOCOL',
      message: 'Only http:// and https:// URLs can be shortened.',
    }
  }

  if (!parsed.hostname) {
    return { ok: false, code: 'INVALID_HOST', message: 'The URL is missing a domain name.' }
  }

  if (options.blockPrivateDestinations && isPrivateHostname(parsed.hostname)) {
    return {
      ok: false,
      code: 'BLOCKED_DESTINATION',
      message: 'Links to private or local addresses are not allowed.',
    }
  }

  if (options.baseUrl) {
    try {
      const base = new URL(options.baseUrl)
      if (base.hostname === parsed.hostname && base.port === parsed.port) {
        return {
          ok: false,
          code: 'BLOCKED_DESTINATION',
          message: 'Links to this service cannot be shortened.',
        }
      }
    } catch {
      // An invalid BASE_URL should not break validation of incoming links.
    }
  }

  return { ok: true, url: parsed.toString(), hostname: parsed.hostname }
}

export class UrlService {
  private readonly baseUrl: string
  private readonly blockPrivateDestinations: boolean
  private readonly codeLength: number
  private readonly maxCodeAttempts: number

  constructor(
    private readonly db: Db,
    options: UrlServiceOptions,
  ) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.blockPrivateDestinations = options.blockPrivateDestinations ?? false
    this.codeLength = options.codeLength ?? DEFAULT_CODE_LENGTH
    this.maxCodeAttempts = options.maxCodeAttempts ?? 8
  }

  private toShortLink(row: ShortLinkRow): ShortLink {
    return {
      code: row.code,
      originalUrl: row.original_url,
      shortUrl: `${this.baseUrl}/${row.code}`,
      createdAt: row.created_at,
      clicks: row.clicks,
      lastClickedAt: row.last_clicked_at,
    }
  }

  findByCode(code: string): ShortLink | null {
    if (!code || code.length > 64) return null
    const row = this.db
      .prepare('SELECT * FROM short_links WHERE code = ?')
      .get(code) as ShortLinkRow | undefined
    return row ? this.toShortLink(row) : null
  }

  findByOriginalUrl(originalUrl: string): ShortLink | null {
    const row = this.db
      .prepare('SELECT * FROM short_links WHERE original_url = ? ORDER BY created_at DESC LIMIT 1')
      .get(originalUrl) as ShortLinkRow | undefined
    return row ? this.toShortLink(row) : null
  }

  /**
   * Stores a mapping and returns the created (or pre-existing) short link.
   * Collisions with an existing code are retried with a fresh random identifier.
   */
  create(originalUrl: string): { link: ShortLink; reused: boolean } {
    const existing = this.findByOriginalUrl(originalUrl)
    if (existing) return { link: existing, reused: true }

    const insert = this.db.prepare(
      `INSERT INTO short_links (code, original_url, created_at, clicks)
       VALUES (?, ?, ?, 0)`,
    )

    let lastError: unknown
    for (let attempt = 0; attempt < this.maxCodeAttempts; attempt += 1) {
      const code = this.generateUniqueCode()
      try {
        insert.run(code, originalUrl, new Date().toISOString())
        const created = this.findByCode(code)
        if (!created) throw new Error('Failed to read back the created short link.')
        return { link: created, reused: false }
      } catch (error) {
        lastError = error
        const message = error instanceof Error ? error.message : String(error)
        // A primary-key clash means we simply try another identifier.
        if (message.includes('UNIQUE constraint failed')) continue
        throw error
      }
    }

    throw new Error(
      `Could not allocate a unique short code after ${this.maxCodeAttempts} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    )
  }

  /** Generates a random code that is not reserved and not already taken. */
  generateUniqueCode(): string {
    for (let attempt = 0; attempt < this.maxCodeAttempts; attempt += 1) {
      const code = generateCode(this.codeLength)
      if (isReservedCode(code)) continue
      const taken = this.db.prepare('SELECT 1 FROM short_links WHERE code = ?').get(code)
      if (!taken) return code
    }
    // Fall back to a longer code to practically eliminate collisions.
    const code = generateCode(this.codeLength + 4)
    const taken = this.db.prepare('SELECT 1 FROM short_links WHERE code = ?').get(code)
    if (taken) throw new Error('Could not allocate a unique short code.')
    return code
  }

  listRecent(limit = 25): ShortLink[] {
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 25, 1), 100)
    const rows = this.db
      .prepare('SELECT * FROM short_links ORDER BY created_at DESC LIMIT ?')
      .all(safeLimit) as ShortLinkRow[]
    return rows.map((row) => this.toShortLink(row))
  }

  recordClick(code: string): void {
    this.db
      .prepare(
        `UPDATE short_links
            SET clicks = clicks + 1, last_clicked_at = ?
          WHERE code = ?`,
      )
      .run(new Date().toISOString(), code)
  }

  delete(code: string): boolean {
    const result = this.db.prepare('DELETE FROM short_links WHERE code = ?').run(code)
    return result.changes > 0
  }

  get blockPrivate(): boolean {
    return this.blockPrivateDestinations
  }
}
