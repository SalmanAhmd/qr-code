import { randomInt } from 'node:crypto'

/**
 * Base58 alphabet (Bitcoin style). It omits 0, O, I and l so codes stay
 * hard to misread when a person types one back into a browser.
 */
export const CODE_ALPHABET = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'

export const DEFAULT_CODE_LENGTH = 8

/** Codes that would collide with application routes such as `/api` or `/assets`. */
export const RESERVED_CODES = new Set([
  'api',
  'assets',
  'static',
  'public',
  'admin',
  'healthz',
  'health',
  'favicon',
  'robots',
  'sitemap',
  'index',
  'www',
  'new',
  'edit',
  'delete',
])

export function generateCode(length: number = DEFAULT_CODE_LENGTH): string {
  let code = ''
  for (let index = 0; index < length; index += 1) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]
  }
  return code
}

export function isReservedCode(code: string): boolean {
  return RESERVED_CODES.has(code.toLowerCase())
}
