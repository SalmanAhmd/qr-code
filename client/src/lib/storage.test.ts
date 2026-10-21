import { beforeEach, describe, expect, it } from 'vitest'
import {
  HISTORY_PREFERENCE_KEY,
  MAX_LOCAL_HISTORY_ITEMS,
  QR_HISTORY_KEY,
  addQrHistoryItem,
  clearQrHistory,
  isHistoryEnabled,
  loadQrHistory,
  removeQrHistoryItem,
  saveQrHistory,
  setHistoryEnabled,
  type QrHistoryItem,
} from './storage'
import { DEFAULT_QR_SETTINGS } from './qr'

function item(url: string, id = url): QrHistoryItem {
  return {
    id,
    url,
    createdAt: new Date().toISOString(),
    settings: DEFAULT_QR_SETTINGS,
  }
}

describe('local QR history storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts empty', () => {
    expect(loadQrHistory()).toEqual([])
  })

  it('stores and reloads items', () => {
    saveQrHistory([item('https://example.com/a')])

    const restored = loadQrHistory()
    expect(restored).toHaveLength(1)
    expect(restored[0]?.url).toBe('https://example.com/a')
  })

  it('ignores corrupted data', () => {
    window.localStorage.setItem(QR_HISTORY_KEY, 'not-json')
    expect(loadQrHistory()).toEqual([])
  })

  it('caps the number of stored items', () => {
    const items = Array.from({ length: MAX_LOCAL_HISTORY_ITEMS + 5 }, (_, index) =>
      item(`https://example.com/${index}`, String(index)),
    )
    saveQrHistory(items)

    expect(loadQrHistory()).toHaveLength(MAX_LOCAL_HISTORY_ITEMS)
  })

  it('adds new items first and removes duplicates', () => {
    addQrHistoryItem(item('https://example.com/one', '1'))
    addQrHistoryItem(item('https://example.com/two', '2'))
    addQrHistoryItem(item('https://example.com/one', '3'))

    const restored = loadQrHistory()
    expect(restored).toHaveLength(2)
    expect(restored[0]?.url).toBe('https://example.com/one')
  })

  it('removes a single item', () => {
    addQrHistoryItem(item('https://example.com/one', '1'))
    addQrHistoryItem(item('https://example.com/two', '2'))

    removeQrHistoryItem('1')

    const restored = loadQrHistory()
    expect(restored).toHaveLength(1)
    expect(restored[0]?.id).toBe('2')
  })

  it('clears everything', () => {
    addQrHistoryItem(item('https://example.com/one', '1'))
    clearQrHistory()
    expect(loadQrHistory()).toEqual([])
  })

  it('remembers the storage preference', () => {
    expect(isHistoryEnabled()).toBe(true)
    setHistoryEnabled(false)
    expect(window.localStorage.getItem(HISTORY_PREFERENCE_KEY)).toBe('false')
    expect(isHistoryEnabled()).toBe(false)
  })
})
