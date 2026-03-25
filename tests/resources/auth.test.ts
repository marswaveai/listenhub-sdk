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

function createClient() {
  const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
  new AuthResource(client)
  return client
}

describe('AuthResource', () => {
  it('cliInit sends POST /v1/auth/cli/init with callbackPort', async () => {
    const client = createClient()
    mockFetch.mockResolvedValueOnce(jsonResponse({ sessionId: 'sess-1', authUrl: 'https://auth.test/cli?session_id=sess-1' }))
    const result = await client.auth.cliInit({ callbackPort: 19526 })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.test.com/api/v1/auth/cli/init')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ callbackPort: 19526 })
    expect(result).toEqual({ sessionId: 'sess-1', authUrl: 'https://auth.test/cli?session_id=sess-1' })
  })

  it('cliToken sends POST /v1/auth/cli/token', async () => {
    const client = createClient()
    mockFetch.mockResolvedValueOnce(jsonResponse({ accessToken: 'at', refreshToken: 'rt', expiresIn: 2592000 }))
    const result = await client.auth.cliToken({ sessionId: 'sess-1', code: 'code-1' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.test.com/api/v1/auth/cli/token')
    expect(JSON.parse(init.body)).toEqual({ sessionId: 'sess-1', code: 'code-1' })
    expect(result.accessToken).toBe('at')
  })

  it('refresh sends POST /v1/auth/token with skipAutoRefresh', async () => {
    const client = createClient()
    mockFetch.mockResolvedValueOnce(jsonResponse({ accessToken: 'new-at', refreshToken: 'new-rt', expiresIn: 2592000 }))
    const result = await client.auth.refresh({ refreshToken: 'old-rt' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.test.com/api/v1/auth/token')
    expect(JSON.parse(init.body)).toEqual({ grantType: 'refresh_token', refreshToken: 'old-rt' })
    expect(result.accessToken).toBe('new-at')
  })

  it('revoke sends POST /v1/auth/token/revoke', async () => {
    const client = createClient()
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    await client.auth.revoke({ refreshToken: 'rt-to-revoke' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.test.com/api/v1/auth/token/revoke')
    expect(JSON.parse(init.body)).toEqual({ refreshToken: 'rt-to-revoke' })
  })
})
