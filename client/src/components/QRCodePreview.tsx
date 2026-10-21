import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, QrCode, TriangleAlert } from 'lucide-react'
import {
  DEFAULT_QR_SETTINGS,
  downloadQrPng,
  hasLowContrast,
  qrFileName,
  renderQrToCanvas,
  type QrSettings,
} from '../lib/qr'
import { CopyButton } from './CopyButton'

export type QrRenderStatus = 'idle' | 'rendering' | 'ready' | 'error'

interface RenderState {
  /** The text the current result belongs to. */
  key: string
  status: 'ready' | 'error'
  error: string | null
}

interface QRCodePreviewProps {
  /** The content encoded in the QR code. */
  text: string
  settings?: QrSettings
  title?: string
  description?: string
  /** Rendered width of the canvas in pixels. */
  displaySize?: number
  className?: string
  /** Change this value to force a new render of the same content. */
  renderKey?: string
  onRendered?: (text: string) => void
  onStatusChange?: (status: QrRenderStatus) => void
}

export function QRCodePreview({
  text,
  settings = DEFAULT_QR_SETTINGS,
  title = 'QR code preview',
  description,
  displaySize = 260,
  className = '',
  renderKey = '',
  onRendered,
  onStatusChange,
}: QRCodePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [renderState, setRenderState] = useState<RenderState>({
    key: '',
    status: 'ready',
    error: null,
  })
  const [isDownloading, setIsDownloading] = useState(false)

  const onStatusChangeRef = useRef(onStatusChange)
  const onRenderedRef = useRef(onRendered)

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
    onRenderedRef.current = onRendered
  }, [onStatusChange, onRendered])

  // The status is derived: while a new render is in flight the key does not
  // match yet, so the preview shows the loading state without extra effects.
  const status: QrRenderStatus = !text
    ? 'idle'
    : renderState.key === `${text}|${renderKey}`
      ? renderState.status
      : 'rendering'

  const errorMessage = status === 'error' ? renderState.error : null

  useEffect(() => {
    if (!text) return

    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false

    renderQrToCanvas(canvas, text, settings)
      .then(() => {
        if (cancelled) return
        setRenderState({ key: `${text}|${renderKey}`, status: 'ready', error: null })
        onStatusChangeRef.current?.('ready')
        onRenderedRef.current?.(text)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message =
          error instanceof Error
            ? error.message
            : 'The QR code could not be generated for this link.'
        setRenderState({ key: `${text}|${renderKey}`, status: 'error', error: message })
        onStatusChangeRef.current?.('error')
      })

    return () => {
      cancelled = true
    }
  }, [text, settings, renderKey])

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadQrPng(text, settings, qrFileName(text))
    } catch {
      setRenderState((current) => ({
        ...current,
        error: 'The PNG download failed. Please try again.',
      }))
    } finally {
      setIsDownloading(false)
    }
  }

  const lowContrast = hasLowContrast(settings.foreground, settings.background)

  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-3"
          // style={{ width: displaySize + 24, height: displaySize + 24 }}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={text ? `QR code for ${text}` : 'QR code preview'}
            className="h-auto w-full max-w-full rounded-lg"
            style={{ width: displaySize, height: displaySize }}
            hidden={status === 'idle'}
          />
          {status === 'rendering' ? (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
              <span className="text-sm">Rendering…</span>
            </div>
          ) : null}
          {status === 'idle' ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <QrCode className="h-10 w-10" aria-hidden="true" />
              <span className="text-sm">Nothing generated yet</span>
            </div>
          ) : null}
          {status === 'error' ? (
            <div className="flex flex-col items-center gap-2 px-4 text-center text-rose-600">
              <TriangleAlert className="h-8 w-8" aria-hidden="true" />
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
          ) : null}
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>

        {lowContrast ? (
          <p className="w-full rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
            Heads up: these colours have low contrast, so the code may be hard to scan.
          </p>
        ) : null}

        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!text || status === 'error' || isDownloading}
            className="btn-primary"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            Download PNG
          </button>
          <CopyButton value={text} label="encoded link" showLabel className="btn-secondary" />
        </div>
      </div>
    </div>
  )
}
