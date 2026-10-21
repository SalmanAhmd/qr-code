import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { URLShortener } from './URLShortener'

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

describe('URLShortener', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('validates the URL before calling the API', async () => {
    const user = userEvent.setup()
    render(<URLShortener />)

    await user.type(screen.getByLabelText(/long url/i), 'ftp://example.com')
    await user.click(screen.getByRole('button', { name: /shorten url/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/only http/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the short link returned by the server', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        originalUrl: 'https://example.com/long/path',
        shortUrl: 'https://links.test/abc123',
        code: 'abc123',
        createdAt: new Date().toISOString(),
        clicks: 0,
        reused: false,
      }),
    )

    const user = userEvent.setup()
    render(<URLShortener />)

    await user.type(screen.getByLabelText(/long url/i), 'https://example.com/long/path')
    await user.click(screen.getByRole('button', { name: /shorten url/i }))

    expect(await screen.findByText('https://links.test/abc123')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/shorten',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('never claims success when the server fails', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'INVALID_URL', message: 'That URL is not allowed.' } }, 400),
    )

    const user = userEvent.setup()
    render(<URLShortener />)

    await user.type(screen.getByLabelText(/long url/i), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /shorten url/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/that url is not allowed/i)
    expect(screen.queryByText(/short link ready/i)).not.toBeInTheDocument()
  })

  it('shows a friendly message when the network is unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const user = userEvent.setup()
    render(<URLShortener />)

    await user.type(screen.getByLabelText(/long url/i), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /shorten url/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach/i)
  })

  it('prevents duplicate submissions while a request is running', async () => {
    let resolveRequest: ((value: Response) => void) | undefined
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve
        }),
    )

    const user = userEvent.setup()
    render(<URLShortener />)

    await user.type(screen.getByLabelText(/long url/i), 'https://example.com')
    const button = screen.getByRole('button', { name: /shorten/i })
    await user.click(button)

    await waitFor(() => expect(button).toBeDisabled())
    await user.click(button)

    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveRequest?.(
      jsonResponse({
        originalUrl: 'https://example.com',
        shortUrl: 'https://links.test/xyz',
        code: 'xyz',
        createdAt: new Date().toISOString(),
        clicks: 0,
        reused: false,
      }),
    )

    expect(await screen.findByText('https://links.test/xyz')).toBeInTheDocument()
  })

  it('can create a QR code for the generated short link', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        originalUrl: 'https://example.com/long/path',
        shortUrl: 'https://links.test/abc123',
        code: 'abc123',
        createdAt: new Date().toISOString(),
        clicks: 0,
        reused: false,
      }),
    )

    const user = userEvent.setup()
    render(<URLShortener />)

    await user.type(screen.getByLabelText(/long url/i), 'https://example.com/long/path')
    await user.click(screen.getByRole('button', { name: /shorten url/i }))
    await screen.findByText('https://links.test/abc123')

    await user.click(
      screen.getByRole('button', { name: /generate qr code for this short link/i }),
    )

    expect(await screen.findByText(/qr code for your short link/i)).toBeInTheDocument()
  })
})
