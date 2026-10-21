import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Eraser, Link2, Loader2, Sparkles } from 'lucide-react'
import { QRCodePreview } from './QRCodePreview'
import {
  DEFAULT_QR_SETTINGS,
  QR_ERROR_CORRECTION_LABELS,
  QR_ERROR_CORRECTION_LEVELS,
  QR_SIZE_OPTIONS,
  hasLowContrast,
  type QrErrorCorrectionLevel,
  type QrSettings,
} from '../lib/qr'
import { validateUrl } from '../lib/url-validation'
import { addQrHistoryItem, isHistoryEnabled } from '../lib/storage'

interface QRCodeGeneratorProps {
  isActive?: boolean
}

const COLOR_PRESETS = [
  { label: 'Ink', foreground: '#0f172a', background: '#ffffff' },
  { label: 'Indigo', foreground: '#4338ca', background: '#ffffff' },
  { label: 'Ocean', foreground: '#0e7490', background: '#ecfeff' },
  { label: 'Forest', foreground: '#14532d', background: '#f0fdf4' },
  { label: 'Sunset', foreground: '#9a3412', background: '#fff7ed' },
]

export function QRCodeGenerator({ isActive = false }: QRCodeGeneratorProps) {
  const inputId = useId()
  const sizeId = useId()
  const errorCorrectionId = useId()
  const foregroundId = useId()
  const backgroundId = useId()

  const [urlInput, setUrlInput] = useState('')
  const [settings, setSettings] = useState<QrSettings>(DEFAULT_QR_SETTINGS)
  const [encodedUrl, setEncodedUrl] = useState<string | null>(null)
  const [renderKey, setRenderKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'rendering' | 'ready' | 'error'>('idle')

  const isGenerating = status === 'rendering'

  const currentValidation = validateUrl(urlInput)
  const isStale =
    Boolean(encodedUrl) && currentValidation.ok && currentValidation.url !== encodedUrl

  const handleStatusChange = useCallback(
    (next: 'idle' | 'rendering' | 'ready' | 'error') => setStatus(next),
    [],
  )

  const storeHistoryItem = useCallback((url: string, nextSettings: QrSettings) => {
    if (!isHistoryEnabled()) return
    addQrHistoryItem({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      createdAt: new Date().toISOString(),
      settings: nextSettings,
    })
  }, [])

  // Keep the preview in sync while the user edits an already generated URL.
  useEffect(() => {
    if (!encodedUrl) return
    const validation = validateUrl(urlInput)
    if (!validation.ok || validation.url === encodedUrl) return

    const handle = window.setTimeout(() => {
      setEncodedUrl(validation.url)
      setError(null)
    }, 600)

    return () => window.clearTimeout(handle)
  }, [urlInput, encodedUrl])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validateUrl(urlInput)

    if (!validation.ok) {
      setError(validation.error)
      setStatus('idle')
      return
    }

    setError(null)
    setStatus('rendering')
    setEncodedUrl(validation.url)
    setRenderKey(`${Date.now()}`)
    storeHistoryItem(validation.url, settings)
  }

  const handleClear = () => {
    setUrlInput('')
    setEncodedUrl(null)
    setError(null)
    setStatus('idle')
    setRenderKey('')
    setSettings(DEFAULT_QR_SETTINGS)
  }

  const updateSetting = <K extends keyof QrSettings>(key: K, value: QrSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const lowContrast = useMemo(
    () => hasLowContrast(settings.foreground, settings.background),
    [settings.foreground, settings.background],
  )

  return (
    <section
      id="qr-generator"
      aria-labelledby="qr-generator-heading"
      className={`scroll-mt-24 rounded-3xl transition ${isActive ? 'ring-2 ring-indigo-200' : ''}`}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8" noValidate>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-sm">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="qr-generator-heading"
                data-section-focus
                tabIndex={-1}
                className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                QR Code Generator
              </h2>
              <p className="text-sm text-slate-500">
                Everything runs in your browser — the link never leaves your device.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor={inputId} className="block text-sm font-semibold text-slate-800">
              Link to encode
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Link2
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id={inputId}
                  name="url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  placeholder="https://example.com"
                  value={urlInput}
                  onChange={(event) => {
                    setUrlInput(event.target.value)
                    if (error) setError(null)
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
                  className="input-field pl-10"
                />
              </div>
              <button type="submit" className="btn-primary sm:w-auto" disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {encodedUrl ? 'Regenerate' : 'Generate QR Code'}
              </button>
              <button type="button" onClick={handleClear} className="btn-secondary">
                <Eraser className="h-4 w-4" aria-hidden="true" />
                Clear
              </button>
            </div>

            <p id={`${inputId}-hint`} className="mt-2 text-xs text-slate-500">
              Only http:// and https:// links are supported. You can paste{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5">example.com</code> and we will add
              the protocol for you.
            </p>

            <div aria-live="polite" className="mt-2 min-h-5">
              {error ? (
                <p
                  id={`${inputId}-error`}
                  role="alert"
                  className="flex items-start gap-2 text-sm font-medium text-rose-600"
                >
                  {error}
                </p>
              ) : isStale ? (
                <p className="text-sm text-amber-700">
                  The preview still shows the previous link — it refreshes automatically in a moment.
                </p>
              ) : null}
            </div>
          </div>

          <fieldset className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <legend className="px-1 text-sm font-semibold text-slate-800">Customise your QR code</legend>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={sizeId} className="block text-sm font-medium text-slate-700">
                  Size
                </label>
                <select
                  id={sizeId}
                  value={settings.size}
                  onChange={(event) => updateSetting('size', Number(event.target.value))}
                  className="input-field mt-1.5 py-2.5"
                >
                  {QR_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} × {size} px
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={errorCorrectionId} className="block text-sm font-medium text-slate-700">
                  Error correction
                </label>
                <select
                  id={errorCorrectionId}
                  value={settings.errorCorrection}
                  onChange={(event) =>
                    updateSetting('errorCorrection', event.target.value as QrErrorCorrectionLevel)
                  }
                  className="input-field mt-1.5 py-2.5"
                >
                  {QR_ERROR_CORRECTION_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level} — {QR_ERROR_CORRECTION_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={foregroundId} className="block text-sm font-medium text-slate-700">
                  Foreground colour
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id={foregroundId}
                    type="color"
                    value={settings.foreground}
                    onChange={(event) => updateSetting('foreground', event.target.value)}
                    className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                  />
                  <input
                    type="text"
                    value={settings.foreground}
                    onChange={(event) => updateSetting('foreground', event.target.value)}
                    aria-label="Foreground colour hex value"
                    className="input-field py-2.5 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={backgroundId} className="block text-sm font-medium text-slate-700">
                  Background colour
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id={backgroundId}
                    type="color"
                    value={settings.background}
                    onChange={(event) => updateSetting('background', event.target.value)}
                    className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                  />
                  <input
                    type="text"
                    value={settings.background}
                    onChange={(event) => updateSetting('background', event.target.value)}
                    aria-label="Background colour hex value"
                    className="input-field py-2.5 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      foreground: preset.foreground,
                      background: preset.background,
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span
                    className="h-4 w-4 rounded border border-slate-300"
                    style={{ backgroundColor: preset.background }}
                    aria-hidden="true"
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: preset.foreground }}
                    aria-hidden="true"
                  />
                  {preset.label}
                </button>
              ))}
              {lowContrast ? (
                <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                  Low contrast — the code may scan poorly
                </span>
              ) : null}
            </div>
          </fieldset>
        </form>

        <QRCodePreview
          text={encodedUrl ?? ''}
          settings={settings}
          renderKey={renderKey}
          title={encodedUrl ? 'Your QR code is ready' : 'QR code preview'}
          description={encodedUrl ?? 'Enter a link and press “Generate QR Code”.'}
          onStatusChange={handleStatusChange}
          className="lg:sticky lg:top-24"
        />
      </div>
    </section>
  )
}
