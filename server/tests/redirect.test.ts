import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createTestApp } from './helpers.js'

describe('GET /:code redirect', () => {
  it('redirects a visitor to the original destination', async () => {
    const { app } = createTestApp()
    const created = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/some/long/path' })

    const response = await request(app).get(`/${created.body.code}`)

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('https://example.com/some/long/path')
  })

  it('counts the redirect as a click', async () => {
    const { app } = createTestApp()
    const created = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/clicks' })

    await request(app).get(`/${created.body.code}`)
    await request(app).get(`/${created.body.code}`)

    const link = await request(app).get(`/api/links/${created.body.code}`)
    expect(link.body.clicks).toBe(2)
    expect(link.body.lastClickedAt).toBeTruthy()
  })

  it('returns a 404 page for unknown codes', async () => {
    const { app } = createTestApp()

    const response = await request(app).get('/doesnotexist')

    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toMatch(/text\/html/)
    expect(response.text).toContain('Short link not found')
  })

  it('never redirects to a javascript: destination', async () => {
    const { app, db } = createTestApp()
    db.prepare(
      'INSERT INTO short_links (code, original_url, created_at, clicks) VALUES (?, ?, ?, 0)',
    ).run('evil1', 'javascript:alert(1)', new Date().toISOString())

    const response = await request(app).get('/evil1')

    expect(response.status).toBe(404)
  })
})

describe('GET /api/links', () => {
  it('returns the persisted short links, newest first', async () => {
    const { app } = createTestApp()
    await request(app).post('/api/shorten').send({ url: 'https://example.com/one' })
    await request(app).post('/api/shorten').send({ url: 'https://example.com/two' })

    const response = await request(app).get('/api/links')

    expect(response.status).toBe(200)
    expect(response.body.links).toHaveLength(2)
    expect(response.body.links[0].originalUrl).toBe('https://example.com/two')
    expect(response.body.links[0].shortUrl).toMatch(/^https:\/\/links\.test\//)
  })

  it('returns a 404 for an unknown code', async () => {
    const { app } = createTestApp()

    const response = await request(app).get('/api/links/nope')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })
})
