import { useEffect, useRef } from 'react'
import { renderQrToCanvas, type QrSettings } from '../lib/qr'

interface QrThumbnailProps {
  text: string
  size?: number
  settings?: QrSettings
  className?: string
}

const THUMBNAIL_SETTINGS: QrSettings = {
  size: 128,
  foreground: '#0f172a',
  background: '#ffffff',
  errorCorrection: 'L',
}

export function QrThumbnail({ text, size = 64, settings = THUMBNAIL_SETTINGS, className = '' }: QrThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !text) return

    renderQrToCanvas(canvas, text, { ...settings, size }).catch(() => {
      // A thumbnail is decorative — a failure must not break the list.
    })
  }, [text, size, settings])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      role="img"
      aria-label={`QR code preview for ${text}`}
      className={`shrink-0 rounded-lg border border-slate-200 bg-white ${className}`}
    />
  )
}
