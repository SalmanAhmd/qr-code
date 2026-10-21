import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  Download,
  ExternalLink,
  History,
  Loader2,
  QrCode,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { downloadQrPng, qrFileName } from '../lib/qr'
import { getLinkState, refreshLinks, subscribeToLinks } from '../lib/link-store'
import {
  clearQrHistory,
  isHistoryEnabled,
  loadQrHistory,
  removeQrHistoryItem,
  setHistoryEnabled,
  type QrHistoryItem,
} from '../lib/storage'
import { HISTORY_CHANGED_EVENT, LINKS_CHANGED_EVENT } from '../lib/events'
import { CopyButton } from './CopyButton'
import { QRCodePreview } from './QRCodePreview'
import { QrThumbnail } from './QrThumbnail'

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function HistoryList() {
  const [localItems, setLocalItems] = useState<QrHistoryItem[]>(() => loadQrHistory())
  const [storeHistory, setStoreHistory] = useState(() => isHistoryEnabled())
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const { links: serverLinks, error: serverError, loading: isLoading } = useSyncExternalStore(
    subscribeToLinks,
    getLinkState,
    getLinkState,
  )

  const refreshLocal = useCallback(() => {
    setLocalItems(loadQrHistory())
  }, [])

  useEffect(() => {
    const onLocalChange = () => refreshLocal()
    const onLinksChange = () => void refreshLinks()

    window.addEventListener(HISTORY_CHANGED_EVENT, onLocalChange)
    window.addEventListener(LINKS_CHANGED_EVENT, onLinksChange)
    void refreshLinks()

    return () => {
      window.removeEventListener(HISTORY_CHANGED_EVENT, onLocalChange)
      window.removeEventListener(LINKS_CHANGED_EVENT, onLinksChange)
    }
  }, [refreshLocal])

  const error = downloadError ?? serverError

  const handleToggleHistory = (enabled: boolean) => {
    setStoreHistory(enabled)
    setHistoryEnabled(enabled)
    if (!enabled) {
      clearQrHistory()
      refreshLocal()
    }
  }

  const handleClearLocal = () => {
    clearQrHistory()
    refreshLocal()
  }

  const handleDownload = async (text: string) => {
    try {
      await downloadQrPng(text, undefined, qrFileName(text))
      setDownloadError(null)
    } catch {
      setDownloadError('The PNG download failed. Please try again.')
    }
  }

  const isEmpty = localItems.length === 0 && serverLinks.length === 0 && !isLoading

  return (
    <section id="history" aria-labelledby="history-heading" className="scroll-mt-24">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <History className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="history-heading"
                data-section-focus
                tabIndex={-1}
                className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                Recent activity
              </h2>
              <p className="text-sm text-slate-500">
                Shortened links come from the server. QR codes stay on this device only.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={storeHistory}
                onChange={(event) => handleToggleHistory(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Save QR history on this device
            </label>
            {localItems.length > 0 ? (
              <button type="button" onClick={handleClearLocal} className="btn-secondary">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Clear local history
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
          Privacy: QR history is stored in this browser&apos;s local storage and is never uploaded.
          Shortened links are stored in the LinkCraft database so the short URL keeps working for
          everyone.
        </p>

        {error ? (
          <p role="alert" className="mt-4 flex items-start gap-2 text-sm font-medium text-rose-600">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading history…
          </p>
        ) : null}

        {isEmpty ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
            <QrCode className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">Nothing here yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Generate a QR code or shorten a link and it will show up here for quick access.
            </p>
          </div>
        ) : null}

        {serverLinks.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Shortened links
            </h3>
            <ul className="mt-3 space-y-3">
              {serverLinks.map((link) => (
                <li
                  key={link.code}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                >
                  <QrThumbnail text={link.shortUrl} size={56} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-semibold text-slate-900">
                      {link.shortUrl}
                    </p>
                    <p className="truncate text-sm text-slate-500" title={link.originalUrl}>
                      → {link.originalUrl}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(link.createdAt)} · {link.clicks}{' '}
                      {link.clicks === 1 ? 'click' : 'clicks'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyButton value={link.shortUrl} label="short link" className="btn-secondary" />
                    <a
                      href={link.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      aria-label={`Open ${link.shortUrl} in a new tab`}
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleDownload(link.shortUrl)}
                      className="btn-secondary"
                      aria-label={`Download the QR code for ${link.shortUrl}`}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      QR
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCode((current) => (current === link.code ? null : link.code))
                      }
                      aria-expanded={expandedCode === link.code}
                      className="btn-secondary"
                    >
                      <QrCode className="h-4 w-4" aria-hidden="true" />
                      Preview
                    </button>
                  </div>
                  {expandedCode === link.code ? (
                    <QRCodePreview
                      text={link.shortUrl}
                      title="QR code for this short link"
                      displaySize={180}
                      className="w-full sm:max-w-sm"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {localItems.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              QR codes from this device
            </h3>
            <ul className="mt-3 space-y-3">
              {localItems.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                >
                  <QrThumbnail text={item.url} size={56} settings={item.settings} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900" title={item.url}>
                      {item.url}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyButton value={item.url} label="link" className="btn-secondary" />
                    <button
                      type="button"
                      onClick={() => void handleDownload(item.url)}
                      className="btn-secondary"
                      aria-label={`Download the QR code for ${item.url}`}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Download QR
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeQrHistoryItem(item.id)
                        refreshLocal()
                      }}
                      className="btn-ghost"
                      aria-label={`Remove ${item.url} from the local history`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
