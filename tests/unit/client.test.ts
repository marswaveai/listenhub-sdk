import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ListenHubClient } from '../../src/client'
import { ListenHubError } from '../../src/types/common'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ code: 0, message: 'Success', data }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function errorResponse(code: number, message: string, status = 200) {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('ListenHubClient', () => {
  describe('request()', () => {
    it('sends GET request and unwraps data from response', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(jsonResponse({ items: [1, 2, 3] }))

      const result = await client.request<{ items: number[] }>('GET', '/v1/things')

      expect(mockFetch).toHaveBeenCalledOnce()
      const req: Request = mockFetch.mock.calls[0][0]
      expect(req.url).toContain('/api/v1/things')
      expect(req.method).toBe('GET')
      expect(result).toEqual({ items: [1, 2, 3] })
    })

    it('sends POST request with JSON body', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'abc' }))

      await client.request('POST', '/v1/things', { body: { name: 'test' } })

      const req: Request = mockFetch.mock.calls[0][0]
      expect(req.method).toBe('POST')
    })

    it('injects Authorization header when accessToken is set', async () => {
      const client = new ListenHubClient({
        baseURL: 'https://api.test.com/api',
        accessToken: 'tok_123',
      })
      mockFetch.mockResolvedValueOnce(jsonResponse({}))

      await client.request('GET', '/v1/me')

      const req: Request = mockFetch.mock.calls[0][0]
      expect(req.headers.get('authorization')).toBe('Bearer tok_123')
    })

    it('returns undefined for 204 No Content', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const result = await client.request('DELETE', '/v1/things/1')

      expect(result).toBeUndefined()
    })
  })

  describe('camelCase / snake_case conversion', () => {
    it('sends request body keys as-is (no conversion)', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      let capturedBody: unknown
      mockFetch.mockImplementationOnce(async (req: Request) => {
        capturedBody = await req.clone().json()
        return jsonResponse({})
      })

      await client.request('POST', '/v1/auth/token', {
        body: { grantType: 'refresh_token', refreshToken: 'rt_123' },
      })

      expect(capturedBody).toEqual({ grantType: 'refresh_token', refreshToken: 'rt_123' })
    })

    it('camelizes response data keys', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          code: 0,
          message: 'ok',
          data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600 },
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      )

      const result = await client.request('POST', '/v1/auth/token')

      expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 })
    })

    it('skips conversion when rawKeys is true', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      let capturedBody: unknown
      mockFetch.mockImplementationOnce(async (req: Request) => {
        capturedBody = await req.clone().json()
        return new Response(JSON.stringify({
          code: 0,
          message: 'ok',
          data: { some_key: 'val' },
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      })

      const result = await client.request('POST', '/v1/raw', {
        body: { someKey: 'val' },
        rawKeys: true,
      })

      // Request body NOT converted
      expect(capturedBody).toEqual({ someKey: 'val' })

      // Response data NOT converted
      expect(result).toEqual({ some_key: 'val' })
    })
  })

  describe('content-type error parsing', () => {
    it('parses JSON error responses', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(errorResponse(21002, 'Auth state not found'))

      try {
        await client.request('POST', '/v1/auth/connect/token', { body: {} })
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ListenHubError)
        expect((e as ListenHubError).code).toBe('21002')
        expect((e as ListenHubError).message).toBe('Auth state not found')
      }
    })

    it('parses HTML error responses (gateway errors)', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(new Response(
        '<html><head><title>502 Bad Gateway</title></head><body></body></html>',
        { status: 502, headers: { 'content-type': 'text/html' } },
      ))

      try {
        await client.request('GET', '/v1/things')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ListenHubError)
        expect((e as ListenHubError).status).toBe(502)
        expect((e as ListenHubError).code).toBe('GATEWAY_ERROR')
        expect((e as ListenHubError).message).toBe('502 Bad Gateway')
      }
    })

    it('handles unknown content-type errors', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(new Response('Bad Gateway', {
        status: 502,
        headers: { 'content-type': 'text/plain' },
      }))

      try {
        await client.request('GET', '/v1/things')
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ListenHubError)
        expect((e as ListenHubError).status).toBe(502)
        expect((e as ListenHubError).code).toBe('UNKNOWN_ERROR')
      }
    })
  })

  describe('hooks', () => {
    it('calls onRequest hook with Request object', async () => {
      const onRequest = vi.fn()
      const client = new ListenHubClient({
        baseURL: 'https://api.test.com/api',
        onRequest,
      })
      mockFetch.mockResolvedValueOnce(jsonResponse({}))

      await client.request('GET', '/v1/things')

      expect(onRequest).toHaveBeenCalledOnce()
      expect(onRequest.mock.calls[0][0]).toBeInstanceOf(Request)
    })

    it('calls onResponse hook with Response and Request', async () => {
      const onResponse = vi.fn()
      const client = new ListenHubClient({
        baseURL: 'https://api.test.com/api',
        onResponse,
      })
      mockFetch.mockResolvedValueOnce(jsonResponse({}))

      await client.request('GET', '/v1/things')

      expect(onResponse).toHaveBeenCalledOnce()
      const [response, request] = onResponse.mock.calls[0]
      expect(response).toBeInstanceOf(Response)
      expect(request).toBeInstanceOf(Request)
    })
  })

  describe('401 auto-refresh', () => {
    it('refreshes token and retries on 401', async () => {
      const onTokenExpired = vi.fn().mockResolvedValueOnce('new_token')
      const client = new ListenHubClient({
        baseURL: 'https://api.test.com/api',
        accessToken: 'old_token',
        onTokenExpired,
      })

      mockFetch
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }))

      const result = await client.request('GET', '/v1/me')

      expect(onTokenExpired).toHaveBeenCalledOnce()
      expect(result).toEqual({ ok: true })
    })

    it('deduplicates concurrent refresh calls (single-flight)', async () => {
      let resolveRefresh: (v: string) => void
      const onTokenExpired = vi.fn().mockReturnValueOnce(
        new Promise<string>((r) => { resolveRefresh = r }),
      )
      const client = new ListenHubClient({
        baseURL: 'https://api.test.com/api',
        accessToken: 'old',
        onTokenExpired,
      })

      mockFetch
        .mockResolvedValueOnce(new Response('', { status: 401 }))
        .mockResolvedValueOnce(new Response('', { status: 401 }))
        .mockImplementation(async () => jsonResponse({ ok: true }))

      const p1 = client.request('GET', '/v1/a')
      const p2 = client.request('GET', '/v1/b')

      await new Promise((r) => setTimeout(r, 10))
      resolveRefresh!('refreshed')

      await Promise.all([p1, p2])

      expect(onTokenExpired).toHaveBeenCalledOnce()
    })

    it('skips auto-refresh when skipAutoRefresh is set', async () => {
      const onTokenExpired = vi.fn()
      const client = new ListenHubClient({
        baseURL: 'https://api.test.com/api',
        accessToken: 'tok',
        onTokenExpired,
      })

      mockFetch.mockResolvedValueOnce(new Response('', { status: 401 }))

      await expect(
        client.request('POST', '/v1/auth/token', { skipAutoRefresh: true }),
      ).rejects.toThrow()

      expect(onTokenExpired).not.toHaveBeenCalled()
    })
  })

  describe('429 rate limit retry', () => {
    it('retries on 429 with Retry-After header (seconds)', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })

      mockFetch
        .mockResolvedValueOnce(new Response('', {
          status: 429,
          headers: { 'retry-after': '0' },
        }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }))

      const result = await client.request('GET', '/v1/things')

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ ok: true })
    })

    it('retries up to maxRetries times then throws', async () => {
      const client = new ListenHubClient({
        baseURL: 'https://api.test.com/api',
        maxRetries: 2,
      })

      mockFetch.mockResolvedValue(new Response(
        JSON.stringify({ code: 42900, message: 'Too many requests' }),
        { status: 429, headers: { 'retry-after': '0', 'content-type': 'application/json' } },
      ))

      await expect(client.request('GET', '/v1/things')).rejects.toThrow(ListenHubError)
      // 1 initial + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('does not retry when maxRetries is 0', async () => {
      const client = new ListenHubClient({
        baseURL: 'https://api.test.com/api',
        maxRetries: 0,
      })

      mockFetch.mockResolvedValueOnce(new Response(
        JSON.stringify({ code: 42900, message: 'Too many requests' }),
        { status: 429, headers: { 'content-type': 'application/json' } },
      ))

      await expect(client.request('GET', '/v1/things')).rejects.toThrow(ListenHubError)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})

describe('ListenHubClient (from index)', () => {
  it('has auth resource auto-wired', async () => {
    const { ListenHubClient } = await import('../../src/index')
    const client = new ListenHubClient()
    expect(client.auth).toBeDefined()
    expect(typeof client.auth.connectInit).toBe('function')
    expect(typeof client.auth.refresh).toBe('function')
  })
})
