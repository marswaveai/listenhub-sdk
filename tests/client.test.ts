import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ListenHubClient } from '../src/client'
import { ListenHubError } from '../src/types/common'

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
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.test.com/api/v1/things')
      expect(init.method).toBe('GET')
      expect(result).toEqual({ items: [1, 2, 3] })
    })

    it('sends POST request with JSON body', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'abc' }))

      await client.request('POST', '/v1/things', { body: { name: 'test' } })

      const [, init] = mockFetch.mock.calls[0]
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(init.body)).toEqual({ name: 'test' })
    })

    it('injects Authorization header when accessToken is set', async () => {
      const client = new ListenHubClient({
        baseURL: 'https://api.test.com/api',
        accessToken: 'tok_123',
      })
      mockFetch.mockResolvedValueOnce(jsonResponse({}))

      await client.request('GET', '/v1/me')

      const [, init] = mockFetch.mock.calls[0]
      expect(init.headers['Authorization']).toBe('Bearer tok_123')
    })

    it('returns undefined for 204 No Content', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const result = await client.request('DELETE', '/v1/things/1')

      expect(result).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('throws ListenHubError with backend error code on API error', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(errorResponse(21002, 'Authorization state not found'))

      try {
        await client.request('POST', '/v1/auth/cli/token', {
          body: { sessionId: 'x', code: 'y' },
        })
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ListenHubError)
        expect((e as ListenHubError).code).toBe('21002')
        expect((e as ListenHubError).message).toBe('Authorization state not found')
      }
    })

    it('throws ListenHubError with UNKNOWN code on non-JSON error', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(new Response('Bad Gateway', {
        status: 502,
        headers: { 'content-type': 'text/plain' },
      }))

      try {
        await client.request('GET', '/v1/things')
      } catch (e) {
        expect(e).toBeInstanceOf(ListenHubError)
        expect((e as ListenHubError).status).toBe(502)
        expect((e as ListenHubError).code).toBe('UNKNOWN')
      }
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
      const [, retryInit] = mockFetch.mock.calls[1]
      expect(retryInit.headers['Authorization']).toBe('Bearer new_token')
    })

    it('deduplicates concurrent refresh calls (single-flight)', async () => {
      let resolveRefresh: (v: string) => void
      const onTokenExpired = vi.fn().mockReturnValueOnce(
        new Promise<string>((r) => { resolveRefresh = r })
      )
      const client = new ListenHubClient({
        baseURL: 'https://api.test.com/api',
        accessToken: 'old',
        onTokenExpired,
      })

      mockFetch
        .mockResolvedValueOnce(new Response('', { status: 401 }))
        .mockResolvedValueOnce(new Response('', { status: 401 }))
        .mockResolvedValue(jsonResponse({ ok: true }))

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
        client.request('POST', '/v1/auth/token', { skipAutoRefresh: true })
      ).rejects.toThrow()

      expect(onTokenExpired).not.toHaveBeenCalled()
    })

    it('throws if no onTokenExpired handler on 401', async () => {
      const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
      mockFetch.mockResolvedValueOnce(new Response('', { status: 401 }))

      await expect(client.request('GET', '/v1/me')).rejects.toThrow(ListenHubError)
    })
  })
})
