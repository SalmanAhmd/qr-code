import { useId, useState } from 'react'
import { ExternalLink, Link2, Loader2, QrCode, RotateCcw, TriangleAlert } from 'lucide-react'
import { ApiError, shortenUrl, type ShortenResult } from '../lib/api'
import { validateUrl } from '../lib/url-validation'
import { CopyButton } from './CopyButton'
import { QRCodePreview } from './QRCodePreview'

interface URLShortenerProps {
  isActive?: boolean
  onShortened?: (result: ShortenResult) => void
}

export function URLShortener({ isActive = false, onShortened }: URLShortenerProps) {
  const inputId = useId()
  const [urlInput, setUrlInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ShortenResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const validation = validateUrl(urlInput)
    if (!validation.ok) {
      setError(validation.error)
      setResult(null)
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const shortened = await shortenUrl(validation.url)
      setResult(shortened)
      setShowQr(false)
      onShortened?.(shortened)
    } catch (requestError) {
      setResult(null)
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Something went wrong while shortening the link. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setUrlInput('')
    setResult(null)
    setError(null)
    setShowQr(false)
  }

  return (
    <section
      id="url-shortener"
      aria-labelledby="url-shortener-heading"
      className={`scroll-mt-24 rounded-3xl transition ${isActive ? 'ring-2 ring-indigo-200' : ''}`}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8" noValidate>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-sm">
              <Link2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="url-shortener-heading"
                data-section-focus
                tabIndex={-1}
                className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                URL Shortener
              </h2>
              <p className="text-sm text-slate-500">
                Short links are stored on the server, so they keep working after a restart.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor={inputId} className="block text-sm font-semibold text-slate-800">
              Long URL
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
                  placeholder="https://example.com/a-very-long-path?utm_source=newsletter"
                  value={urlInput}
                  onChange={(event) => {
                    setUrlInput(event.target.value)
                    if (error) setError(null)
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={`${inputId}-hint`}
                  className="input-field pl-10"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {isSubmitting ? 'Shortening…' : 'Shorten URL'}
              </button>
              <button type="button" onClick={handleReset} className="btn-secondary">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset
              </button>
            </div>

            <p id={`${inputId}-hint`} className="mt-2 text-xs text-slate-500">
              The destination is validated on the server. Only http:// and https:// links are accepted.
            </p>

            <div aria-live="polite" className="mt-2 min-h-5">
              {error ? (
                <p role="alert" className="flex items-start gap-2 text-sm font-medium text-rose-600">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          {result ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
              <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                {result.reused ? 'Existing link reused' : 'Short link ready'}
              </p>

              <p className="mt-2 font-mono text-lg break-all text-slate-900">{result.shortUrl}</p>

              <p className="mt-2 truncate text-sm text-slate-500" title={result.originalUrl}>
                → {result.originalUrl}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <CopyButton value={result.shortUrl} label="short link" showLabel className="btn-primary" />
                <a
                  href={result.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open short link
                </a>
                <button
                  type="button"
                  onClick={() => setShowQr((visible) => !visible)}
                  aria-expanded={showQr}
                  aria-controls="short-link-qr"
                  className="btn-secondary"
                >
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  {showQr ? 'Hide QR code' : 'Generate QR code for this short link'}
                </button>
              </div>
            </div>
          ) : null}

          {showQr && result ? (
            <div id="short-link-qr" className="mt-6">
              <QRCodePreview
                text={result.shortUrl}
                title="QR code for your short link"
                description="Scan it to open the shortened URL."
                displaySize={220}
              />
            </div>
          ) : null}
        </form>

        <div className="card hidden p-6 text-sm leading-relaxed text-slate-600 lg:block">
          <h3 className="text-base font-bold text-slate-900">How shortening works</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>The URL is validated on the server (http/https only).</li>
            <li>A random, hard to guess identifier is generated.</li>
            <li>The mapping is stored in SQLite, so it survives restarts.</li>
            <li>Opening the short link performs a 302 redirect to the original URL.</li>
          </ol>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Requests are rate limited and repeated destinations reuse the same short code instead of
            piling up duplicates.
          </p>
        </div>
      </div>
    </section>
  )
}
