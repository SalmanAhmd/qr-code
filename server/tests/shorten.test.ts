import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createTestApp } from './helpers.js'

describe('POST /api/shorten', () => {
  it('creates a short link and returns the documented payload', async () => {
    const { app } = createTestApp()

    const response = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/some/long/path' })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      originalUrl: 'https://example.com/some/long/path',
      code: expect.any(String),
      shortUrl: expect.any(String),
    })
    expect(response.body.code).toMatch(/^[1-9a-zA-Z]{8}$/)
    expect(response.body.shortUrl).toBe(`https://links.test/${response.body.code}`)
  })

  it('reuses the existing code when the same URL is shortened again', async () => {
    const { app } = createTestApp()
    const payload = { url: 'https://example.com/repeat' }

    const first = await request(app).post('/api/shorten').send(payload)
    const second = await request(app).post('/api/shorten').send(payload)

    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect(second.body.code).toBe(first.body.code)
    expect(second.body.reused).toBe(true)
  })

  it('generates different codes for different URLs', async () => {
    const { app } = createTestApp()

    const first = await request(app).post('/api/shorten').send({ url: 'https://example.com/a' })
    const second = await request(app).post('/api/shorten').send({ url: 'https://example.com/b' })

    expect(first.body.code).not.toBe(second.body.code)
  })

  it('rejects an empty url', async () => {
    const { app } = createTestApp()

    const response = await request(app).post('/api/shorten').send({ url: '' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_URL')
  })

  it('rejects a missing url field', async () => {
    const { app } = createTestApp()

    const response = await request(app).post('/api/shorten').send({})

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_URL')
  })

  it('rejects malformed URLs', async () => {
    const { app } = createTestApp()

    const response = await request(app).post('/api/shorten').send({ url: 'not a url' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_URL')
  })

  it('rejects unsupported protocols', async () => {
    const { app } = createTestApp()

    const response = await request(app).post('/api/shorten').send({ url: 'javascript:alert(1)' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('UNSUPPORTED_PROTOCOL')
  })

  it('rejects a body that is not a JSON object', async () => {
    const { app } = createTestApp()

    const response = await request(app)
      .post('/api/shorten')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(['https://example.com']))

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_BODY')
  })

  it('rejects URLs that are longer than the allowed maximum', async () => {
    const { app } = createTestApp()
    const longUrl = `https://example.com/${'a'.repeat(2100)}`

    const response = await request(app).post('/api/shorten').send({ url: longUrl })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('URL_TOO_LONG')
  })

  it('blocks private destinations when the protection is enabled', async () => {
    const { app } = createTestApp({ blockPrivateDestinations: true })

    const response = await request(app).post('/api/shorten').send({ url: 'http://127.0.0.1:8080/x' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('BLOCKED_DESTINATION')
  })

  it('blocks links that point back at this service', async () => {
    const { app } = createTestApp()

    const response = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://links.test/abc' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('BLOCKED_DESTINATION')
  })

  it('rate limits excessive requests', async () => {
    const { app } = createTestApp({
      shortenRateLimit: { windowMs: 60_000, max: 2 },
    })

    await request(app).post('/api/shorten').send({ url: 'https://example.com/1' })
    await request(app).post('/api/shorten').send({ url: 'https://example.com/2' })
    const blocked = await request(app).post('/api/shorten').send({ url: 'https://example.com/3' })

    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
  })

  it('answers unknown API routes with JSON', async () => {
    const { app } = createTestApp()

    const response = await request(app).get('/api/unknown')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })
})
