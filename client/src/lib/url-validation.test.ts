import { describe, expect, it } from 'vitest'
import { MAX_URL_LENGTH, displayUrl, isValidUrl, validateUrl } from './url-validation'

describe('validateUrl', () => {
  it('accepts a full https URL', () => {
    const result = validateUrl('https://example.com/path?query=1')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.url).toBe('https://example.com/path?query=1')
  })

  it('accepts a full http URL', () => {
    const result = validateUrl('http://example.com')
    expect(result.ok).toBe(true)
  })

  it('adds https:// when the protocol is missing', () => {
    const result = validateUrl('example.com')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.url).toBe('https://example.com/')
  })

  it('trims surrounding whitespace', () => {
    const result = validateUrl('  https://example.com  ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.url).toBe('https://example.com/')
  })

  it('rejects an empty value', () => {
    const result = validateUrl('   ')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('empty')
  })

  it('rejects unsupported protocols', () => {
    for (const value of ['javascript:alert(1)', 'ftp://example.com', 'mailto:hi@example.com']) {
      const result = validateUrl(value)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('unsupported-protocol')
    }
  })

  it('rejects malformed input', () => {
    const result = validateUrl('http://')
    expect(result.ok).toBe(false)
  })

  it('rejects URLs that exceed the maximum length', () => {
    const result = validateUrl(`https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('too-long')
  })

  it('exposes a boolean helper', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('nope')).toBe(false)
  })
})

describe('displayUrl', () => {
  it('removes the protocol', () => {
    expect(displayUrl('https://example.com/path')).toBe('example.com/path')
  })

  it('truncates long values', () => {
    const result = displayUrl('https://example.com/' + 'x'.repeat(100), 20)
    expect(result.length).toBe(20)
    expect(result.endsWith('…')).toBe(true)
  })
})
