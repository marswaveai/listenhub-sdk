import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ListenHubClient } from '../../src/client'
import { AuthResource } from '../../src/resources/auth/index'

const mockFetch = vi.fn()

beforeEach(() => vi.stubGlobal('fetch', mockFetch))
afterEach(() => vi.restoreAllMocks())

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ code: 0, message: 'Success', data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

// ky sends a Request object to fetch with the body already serialized and consumed.
// We use onRequest to capture the request body before ky processes it.
function createClientWithCapture() {
  const captured: { url: string; method: string; body: unknown }[] = []

  const client = new ListenHubClient({
    baseURL: 'https://api.test.com/api',
    onRequest: async (request) => {
      try {
        const cloned = request.clone()
        const text = await cloned.text()
        captured.push({
          url: request.url,
          method: request.method,
          body: text ? JSON.parse(text) : undefined,
        })
      } catch {
        captured.push({ url: request.url, method: request.method, body: undefined })
      }
    },
  })
  new AuthResource(client)
  return { client, captured }
}

describe('AuthResource', () => {
  it('connectInit sends POST /v1/auth/connect/init with callbackPort', async () => {
    const { client, captured } = createClientWithCapture()
    mockFetch.mockResolvedValueOnce(jsonResponse({ sessionId: 'sess-1', authUrl: 'https://auth.test/cli?session_id=sess-1' }))
    const result = await client.auth.connectInit({ callbackPort: 19526 })
    expect(captured[0].url).toBe('https://api.test.com/api/v1/auth/connect/init')
    expect(captured[0].method).toBe('POST')
    expect(captured[0].body).toEqual({ callback_port: 19526 })
    expect(result).toEqual({ sessionId: 'sess-1', authUrl: 'https://auth.test/cli?session_id=sess-1' })
  })

  it('connectToken sends POST /v1/auth/connect/token', async () => {
    const { client, captured } = createClientWithCapture()
    mockFetch.mockResolvedValueOnce(jsonResponse({ accessToken: 'at', refreshToken: 'rt', expiresIn: 2592000 }))
    const result = await client.auth.connectToken({ sessionId: 'sess-1', code: 'code-1' })
    expect(captured[0].url).toBe('https://api.test.com/api/v1/auth/connect/token')
    expect(captured[0].body).toEqual({ session_id: 'sess-1', code: 'code-1' })
    expect(result.accessToken).toBe('at')
  })

  it('refresh sends POST /v1/auth/token with skipAutoRefresh', async () => {
    const { client, captured } = createClientWithCapture()
    mockFetch.mockResolvedValueOnce(jsonResponse({ accessToken: 'new-at', refreshToken: 'new-rt', expiresIn: 2592000 }))
    const result = await client.auth.refresh({ refreshToken: 'old-rt' })
    expect(captured[0].url).toBe('https://api.test.com/api/v1/auth/token')
    expect(captured[0].body).toEqual({ grant_type: 'refresh_token', refresh_token: 'old-rt' })
    expect(result.accessToken).toBe('new-at')
  })

  it('revoke sends POST /v1/auth/token/revoke', async () => {
    const { client, captured } = createClientWithCapture()
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    await client.auth.revoke({ refreshToken: 'rt-to-revoke' })
    expect(captured[0].url).toBe('https://api.test.com/api/v1/auth/token/revoke')
    expect(captured[0].body).toEqual({ refresh_token: 'rt-to-revoke' })
  })
})
