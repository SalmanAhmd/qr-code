export const MAX_URL_LENGTH = 2048

export type UrlErrorReason =
  | 'empty'
  | 'too-long'
  | 'invalid'
  | 'unsupported-protocol'
  | 'invalid-host'

export interface UrlValidationSuccess {
  ok: true
  /** The normalised, absolute URL. */
  url: string
}

export interface UrlValidationFailure {
  ok: false
  error: string
  reason: UrlErrorReason
}

export type UrlValidationResult = UrlValidationSuccess | UrlValidationFailure

const SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Validates a user supplied URL.
 *
 * A missing scheme is treated as `https://` so `example.com` works, but any
 * other protocol (ftp:, javascript:, mailto:, ...) is rejected explicitly.
 */
export function validateUrl(input: string): UrlValidationResult {
  const trimmed = (input ?? '').trim()

  if (!trimmed) {
    return { ok: false, error: 'Please enter a URL to continue.', reason: 'empty' }
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      error: `That URL is too long (maximum ${MAX_URL_LENGTH} characters).`,
      reason: 'too-long',
    }
  }

  const hasScheme = SCHEME_PATTERN.test(trimmed)
  const candidate = hasScheme ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return {
      ok: false,
      error: 'That does not look like a valid URL. Try something like https://example.com.',
      reason: 'invalid',
    }
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return {
      ok: false,
      error: 'Only http:// and https:// links are supported.',
      reason: 'unsupported-protocol',
    }
  }

  if (!parsed.hostname) {
    return { ok: false, error: 'The URL is missing a domain name.', reason: 'invalid-host' }
  }

  if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
    return {
      ok: false,
      error: 'Enter a full domain name, for example example.com.',
      reason: 'invalid-host',
    }
  }

  return { ok: true, url: parsed.toString() }
}

export function isValidUrl(input: string): boolean {
  return validateUrl(input).ok
}

/** Shortens a URL for display purposes (used in list rows). */
export function displayUrl(url: string, maxLength = 64): string {
  const withoutProtocol = url.replace(/^https?:\/\//, '')
  if (withoutProtocol.length <= maxLength) return withoutProtocol
  return `${withoutProtocol.slice(0, maxLength - 1)}…`
}
