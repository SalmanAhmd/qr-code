import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryList } from './HistoryList'
import { resetLinkStore } from '../lib/link-store'

vi.mock('../lib/qr', async () => {
  const actual = await vi.importActual<typeof import('../lib/qr')>('../lib/qr')
  return {
    ...actual,
    renderQrToCanvas: vi.fn(async () => undefined),
    downloadQrPng: vi.fn(async () => undefined),
  }
})

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response
}

describe('HistoryList', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(jsonResponse({ links: [] }))
    vi.stubGlobal('fetch', fetchMock)
    window.localStorage.clear()
    resetLinkStore()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** Waits for the initial server request to settle so React state stays inside act(). */
  async function renderAndSettle() {
    render(<HistoryList />)
    await waitFor(() => expect(screen.queryByText(/loading history/i)).not.toBeInTheDocument())
  }

  it('shows an empty state when there is nothing to display', async () => {
    await renderAndSettle()

    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument()
  })

  it('lists links that were persisted on the server', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        links: [
          {
            code: 'abc123',
            originalUrl: 'https://example.com/long/path',
            shortUrl: 'https://links.test/abc123',
            createdAt: new Date().toISOString(),
            clicks: 3,
            lastClickedAt: null,
          },
        ],
      }),
    )

    await renderAndSettle()

    expect(screen.getByText('https://links.test/abc123')).toBeInTheDocument()
    expect(screen.getByText(/3 clicks/i)).toBeInTheDocument()
  })

  it('explains that QR history stays on the device', async () => {
    await renderAndSettle()

    expect(screen.getByText(/stored in this browser/i)).toBeInTheDocument()
  })

  it('can clear the local history', async () => {
    window.localStorage.setItem(
      'linkcraft.qr-history.v1',
      JSON.stringify([
        {
          id: '1',
          url: 'https://example.com/local',
          createdAt: new Date().toISOString(),
          settings: { size: 512, foreground: '#000000', background: '#ffffff', errorCorrection: 'M' },
        },
      ]),
    )

    const user = userEvent.setup()
    await renderAndSettle()

    expect(screen.getByText('https://example.com/local')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear local history/i }))

    await waitFor(() => expect(screen.queryByText('https://example.com/local')).not.toBeInTheDocument())
  })

  it('shows an error when the server history cannot be loaded', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await renderAndSettle()

    expect(screen.getByRole('alert')).toHaveTextContent(/could not load the server history/i)
  })
})
