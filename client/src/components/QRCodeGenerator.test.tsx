import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QRCodeGenerator } from './QRCodeGenerator'
import { renderQrToCanvas } from '../lib/qr'

vi.mock('../lib/qr', async () => {
  const actual = await vi.importActual<typeof import('../lib/qr')>('../lib/qr')
  return {
    ...actual,
    renderQrToCanvas: vi.fn(async () => undefined),
    downloadQrPng: vi.fn(async () => undefined),
  }
})

const mockedRender = vi.mocked(renderQrToCanvas)

describe('QRCodeGenerator', () => {
  beforeEach(() => {
    mockedRender.mockClear()
    window.localStorage.clear()
  })

  it('renders the heading and an empty preview state', () => {
    render(<QRCodeGenerator />)

    expect(screen.getByRole('heading', { name: /qr code generator/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/link to encode/i)).toBeInTheDocument()
    expect(mockedRender).not.toHaveBeenCalled()
  })

  it('rejects an invalid URL and does not generate a QR code', async () => {
    const user = userEvent.setup()
    render(<QRCodeGenerator />)

    await user.type(screen.getByLabelText(/link to encode/i), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: /generate qr code/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/only http/i)
    expect(mockedRender).not.toHaveBeenCalled()
  })

  it('rejects an empty URL', async () => {
    const user = userEvent.setup()
    render(<QRCodeGenerator />)

    await user.click(screen.getByRole('button', { name: /generate qr code/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/please enter a url/i)
    expect(mockedRender).not.toHaveBeenCalled()
  })

  it('generates a QR code for a valid URL', async () => {
    const user = userEvent.setup()
    render(<QRCodeGenerator />)

    await user.type(screen.getByLabelText(/link to encode/i), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /generate qr code/i }))

    await waitFor(() => expect(mockedRender).toHaveBeenCalled())
    expect(mockedRender.mock.calls[0]?.[1]).toBe('https://example.com/')
  })

  it('clears the form and the preview', async () => {
    const user = userEvent.setup()
    render(<QRCodeGenerator />)

    const input = screen.getByLabelText(/link to encode/i)
    await user.type(input, 'https://example.com')
    await user.click(screen.getByRole('button', { name: /generate qr code/i }))
    await waitFor(() => expect(mockedRender).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: /clear/i }))

    expect(input).toHaveValue('')
    expect(screen.getByText(/nothing generated yet/i)).toBeInTheDocument()
  })

  it('allows the QR code to be customised', async () => {
    const user = userEvent.setup()
    render(<QRCodeGenerator />)

    await user.type(screen.getByLabelText(/link to encode/i), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /generate qr code/i }))
    await waitFor(() => expect(mockedRender).toHaveBeenCalled())

    mockedRender.mockClear()
    await user.selectOptions(screen.getByLabelText(/size/i), '1024')
    await user.selectOptions(screen.getByLabelText(/error correction/i), 'H')

    await waitFor(() => expect(mockedRender).toHaveBeenCalled())
    const settings = mockedRender.mock.calls.at(-1)?.[2]
    expect(settings?.size).toBe(1024)
    expect(settings?.errorCorrection).toBe('H')
  })
})
