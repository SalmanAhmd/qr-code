import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QR_SETTINGS,
  buildQrOptions,
  createQrDataUrl,
  hasLowContrast,
  qrFileName,
} from './qr'

describe('createQrDataUrl', () => {
  it('creates a PNG data URL for a valid URL', async () => {
    const dataUrl = await createQrDataUrl('https://example.com', DEFAULT_QR_SETTINGS)

    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    expect(dataUrl.length).toBeGreaterThan(100)
  })

  it('creates a different image for different content', async () => {
    const first = await createQrDataUrl('https://example.com/one', DEFAULT_QR_SETTINGS)
    const second = await createQrDataUrl('https://example.com/two', DEFAULT_QR_SETTINGS)

    expect(first).not.toBe(second)
  })

  it('honours the requested size', async () => {
    const small = await createQrDataUrl('https://example.com', {
      ...DEFAULT_QR_SETTINGS,
      size: 256,
    })
    const large = await createQrDataUrl('https://example.com', {
      ...DEFAULT_QR_SETTINGS,
      size: 1024,
    })

    expect(large.length).toBeGreaterThan(small.length)
  })
})

describe('buildQrOptions', () => {
  it('maps the settings to the qrcode library options', () => {
    const options = buildQrOptions({
      size: 512,
      foreground: '#123456',
      background: '#ffffff',
      errorCorrection: 'H',
    })

    expect(options.width).toBe(512)
    expect(options.margin).toBeGreaterThanOrEqual(4)
    expect(options.errorCorrectionLevel).toBe('H')
    expect(options.color).toEqual({ dark: '#123456', background: '#ffffff' })
  })
})

describe('qrFileName', () => {
  it('builds a safe file name from a URL', () => {
    expect(qrFileName('https://example.com/some/path')).toBe('example-com-some-path.png')
  })

  it('falls back for invalid input', () => {
    expect(qrFileName('not a url')).toBe('not-a-url.png')
  })
})

describe('hasLowContrast', () => {
  it('detects low contrast colour pairs', () => {
    expect(hasLowContrast('#ffffff', '#ffffff')).toBe(true)
    expect(hasLowContrast('#fafafa', '#ffffff')).toBe(true)
  })

  it('accepts high contrast colour pairs', () => {
    expect(hasLowContrast('#0f172a', '#ffffff')).toBe(false)
  })
})
