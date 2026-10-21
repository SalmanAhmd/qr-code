const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export interface ShortenResult {
  originalUrl: string
  shortUrl: string
  code: string
  createdAt: string
  clicks: number
  reused: boolean
}

export interface LinkRecord {
  code: string
  originalUrl: string
  shortUrl: string
  createdAt: string
  clicks: number
  lastClickedAt: string | null
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status = 0, code = 'NETWORK_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface ErrorPayload {
  error?: { code?: string; message?: string } | string
}

function extractError(payload: unknown, fallback: string): { code: string; message: string } {
  const parsed = payload as ErrorPayload | null
  if (parsed && typeof parsed === 'object' && parsed.error) {
    if (typeof parsed.error === 'string') return { code: 'API_ERROR', message: parsed.error }
    const code = parsed.error.code ?? 'API_ERROR'
    const message = parsed.error.message ?? fallback
    return { code, message }
  }
  return { code: 'API_ERROR', message: fallback }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError(
      'Could not reach the LinkCraft server. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    )
  }

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const { code, message } = extractError(payload, `Request failed with status ${response.status}.`)
    throw new ApiError(message, response.status, code)
  }

  return payload as T
}

export async function shortenUrl(url: string): Promise<ShortenResult> {
  return request<ShortenResult>('/api/shorten', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

export async function fetchRecentLinks(limit = 25): Promise<LinkRecord[]> {
  const payload = await request<{ links?: LinkRecord[] }>(`/api/links?limit=${limit}`)
  return Array.isArray(payload.links) ? payload.links : []
}
