import type { QrSettings } from './qr'
import { emitEvent, HISTORY_CHANGED_EVENT } from './events'

export const QR_HISTORY_KEY = 'linkcraft.qr-history.v1'
export const HISTORY_PREFERENCE_KEY = 'linkcraft.store-history.v1'
export const MAX_LOCAL_HISTORY_ITEMS = 20

export interface QrHistoryItem {
  id: string
  url: string
  createdAt: string
  settings: QrSettings
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    // Access to localStorage can throw in private browsing modes.
    return null
  }
}

export function loadQrHistory(): QrHistoryItem[] {
  const store = storage()
  if (!store) return []
  try {
    const raw = store.getItem(QR_HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is QrHistoryItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as QrHistoryItem).url === 'string' &&
        typeof (item as QrHistoryItem).id === 'string',
    )
  } catch {
    return []
  }
}

export function saveQrHistory(items: QrHistoryItem[]): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(QR_HISTORY_KEY, JSON.stringify(items.slice(0, MAX_LOCAL_HISTORY_ITEMS)))
  } catch {
    // Quota exceeded or storage disabled — history is a convenience only.
  }
}

export function clearQrHistory(): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(QR_HISTORY_KEY)
  } catch {
    // ignore
  }
}

export function isHistoryEnabled(): boolean {
  const store = storage()
  if (!store) return false
  try {
    const raw = store.getItem(HISTORY_PREFERENCE_KEY)
    if (raw === null) return true
    return raw === 'true'
  } catch {
    return false
  }
}

export function setHistoryEnabled(enabled: boolean): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(HISTORY_PREFERENCE_KEY, String(enabled))
  } catch {
    // ignore
  }
}

/** Notifies open components that the local history changed. */
export function notifyHistoryChanged(): void {
  emitEvent(HISTORY_CHANGED_EVENT)
}

/** Adds (or refreshes) an entry in the local QR history and notifies listeners. */
export function addQrHistoryItem(item: QrHistoryItem): void {
  const existing = loadQrHistory().filter((entry) => entry.url !== item.url)
  existing.unshift(item)
  saveQrHistory(existing)
  notifyHistoryChanged()
}

export function removeQrHistoryItem(id: string): void {
  saveQrHistory(loadQrHistory().filter((entry) => entry.id !== id))
  notifyHistoryChanged()
}
