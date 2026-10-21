import QRCode from 'qrcode'

export const QR_ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'] as const
export type QrErrorCorrectionLevel = (typeof QR_ERROR_CORRECTION_LEVELS)[number]

export const QR_SIZE_OPTIONS = [256, 512, 1024] as const
export type QrSize = (typeof QR_SIZE_OPTIONS)[number]

export interface QrSettings {
  /** Rendered pixel size of the QR code. */
  size: number
  /** Colour of the QR modules. */
  foreground: string
  /** Colour of the background / quiet zone. */
  background: string
  /** Reed-Solomon error correction level. */
  errorCorrection: QrErrorCorrectionLevel
}

export const DEFAULT_QR_SETTINGS: QrSettings = {
  size: 512,
  foreground: '#0f172a',
  background: '#ffffff',
  errorCorrection: 'M',
}

export const QR_ERROR_CORRECTION_LABELS: Record<QrErrorCorrectionLevel, string> = {
  L: 'Low (7%)',
  M: 'Medium (15%)',
  Q: 'Quartile (25%)',
  H: 'High (30%)',
}

export interface QrOptions {
  width: number
  margin: number
  errorCorrectionLevel: QrErrorCorrectionLevel
  color: { dark: string; background: string }
}

export function buildQrOptions(settings: QrSettings): QrOptions {
  return {
    width: settings.size,
    // A quiet zone of at least 4 modules keeps the code scannable.
    margin: 4,
    errorCorrectionLevel: settings.errorCorrection,
    color: { dark: settings.foreground, background: settings.background },
  }
}

/** Creates a PNG data URL for the given content. Works in the browser and in Node. */
export async function createQrDataUrl(
  text: string,
  settings: QrSettings = DEFAULT_QR_SETTINGS,
): Promise<string> {
  return QRCode.toDataURL(text, buildQrOptions(settings))
}

/** Renders the QR code into an existing canvas element. */
export async function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  settings: QrSettings = DEFAULT_QR_SETTINGS,
): Promise<void> {
  await QRCode.toCanvas(canvas, text, buildQrOptions(settings))
}

/** Builds a safe file name such as `qr-example-com.png`. */
export function qrFileName(text: string, extension = 'png'): string {
  let slug = 'qr-code'
  try {
    const { hostname, pathname } = new URL(text)
    slug = `${hostname}${pathname}`.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  } catch {
    slug = text.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }
  if (!slug) slug = 'qr-code'
  return `${slug.slice(0, 60)}.${extension}`
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

/**
 * Generates the QR code and triggers a PNG download.
 * A blob URL is used because `download` attributes work more reliably than
 * data URLs on mobile browsers.
 */
export async function downloadQrPng(
  text: string,
  settings: QrSettings = DEFAULT_QR_SETTINGS,
  fileName: string = qrFileName(text),
): Promise<void> {
  const dataUrl = await createQrDataUrl(text, settings)

  let url = dataUrl
  try {
    url = URL.createObjectURL(await dataUrlToBlob(dataUrl))
  } catch {
    // Fall back to the data URL when the blob conversion is not possible.
  }

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()

  if (url !== dataUrl) {
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
}

/** Relative luminance of a hex colour, used for the contrast warning. */
export function relativeLuminance(hexColor: string): number {
  const normalized = hexColor.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return 1
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(normalized.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const [r, g, b] = channels
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

/**
 * Warns when the foreground and background colours are too similar, which
 * would make the generated code hard to scan.
 */
export function hasLowContrast(foreground: string, background: string): boolean {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  return ratio < 3
}
