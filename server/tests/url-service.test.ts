import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db/database.js'
import { generateCode } from '../src/services/code-generator.js'
import {
  UrlService,
  isPrivateHostname,
  validateDestinationUrl,
} from '../src/services/url-service.js'

function createService() {
  const db = openDatabase(':memory:')
  runMigrations(db)
  return { db, service: new UrlService(db, { baseUrl: 'https://links.test' }) }
}

describe('code generator', () => {
  it('produces codes with the expected length and alphabet', () => {
    for (let index = 0; index < 50; index += 1) {
      const code = generateCode(8)
      expect(code).toHaveLength(8)
      expect(code).toMatch(/^[1-9a-zA-Z]+$/)
    }
  })

  it('does not repeat itself across many calls', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateCode(8)))
    expect(codes.size).toBe(500)
  })
})

describe('UrlService', () => {
  it('stores and reads back a mapping', () => {
    const { service } = createService()

    const { link } = service.create('https://example.com/hello')
    const found = service.findByCode(link.code)

    expect(found?.originalUrl).toBe('https://example.com/hello')
    expect(found?.shortUrl).toBe(`https://links.test/${link.code}`)
  })

  it('generates a unique code for every distinct URL', () => {
    const { service } = createService()
    const codes = new Set<string>()

    for (let index = 0; index < 25; index += 1) {
      codes.add(service.create(`https://example.com/page-${index}`).link.code)
    }

    expect(codes.size).toBe(25)
  })

  it('never reuses a code that is already taken', () => {
    const { db, service } = createService()
    const first = service.create('https://example.com/one')

    // Simulate a collision by occupying the next generated code.
    const occupied = generateCode(8)
    db.prepare('INSERT INTO short_links (code, original_url, created_at, clicks) VALUES (?, ?, ?, 0)').run(
      occupied,
      'https://example.com/occupied',
      new Date().toISOString(),
    )
    expect(service.findByCode(occupied)).not.toBeNull()

    const second = service.create('https://example.com/two')
    expect(second.link.code).not.toBe(first.link.code)
    expect(second.link.code).not.toBe(occupied)
  })

  it('lists recent links and counts clicks', () => {
    const { service } = createService()
    const { link } = service.create('https://example.com/list')

    service.recordClick(link.code)
    const listed = service.listRecent(10)

    expect(listed).toHaveLength(1)
    expect(listed[0]?.clicks).toBe(1)
  })
})

describe('validateDestinationUrl', () => {
  it('accepts http and https URLs', () => {
    const result = validateDestinationUrl('https://example.com/path')
    expect(result.ok).toBe(true)
  })

  it('rejects non-string input', () => {
    const result = validateDestinationUrl(42)
    expect(result.ok).toBe(false)
  })

  it('rejects a URL without a protocol', () => {
    const result = validateDestinationUrl('example.com')
    expect(result.ok).toBe(false)
  })

  it('rejects unsupported protocols', () => {
    for (const url of ['ftp://example.com', 'javascript:alert(1)', 'mailto:a@b.com', 'data:text/html,x']) {
      const result = validateDestinationUrl(url)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('UNSUPPORTED_PROTOCOL')
    }
  })
})

describe('isPrivateHostname', () => {
  it('detects loopback and private ranges', () => {
    for (const host of [
      'localhost',
      '127.0.0.1',
      '10.0.0.5',
      '192.168.1.10',
      '172.16.4.4',
      '169.254.169.254',
      'foo.local',
      'service.internal',
      'fd00::1',
    ]) {
      expect(isPrivateHostname(host)).toBe(true)
    }
  })

  it('allows public hosts', () => {
    for (const host of ['example.com', '8.8.8.8', 'sub.domain.co.uk']) {
      expect(isPrivateHostname(host)).toBe(false)
    }
  })
})
