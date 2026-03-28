import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import getPort from 'get-port'
import { ListenHubClient } from '../../src/client'
import { ListenHubError } from '../../src/types/common'
import { createMockServer } from '../fixtures/server'

let server: Server
let baseURL: string

beforeAll(async () => {
  const port = await getPort()
  const app = createMockServer()
  server = app.listen(port)
  baseURL = `http://127.0.0.1:${port}/api`
})

afterAll(() => {
  server?.close()
})

describe('Integration: ListenHubClient', () => {
  it('GET request with camelCase response', async () => {
    const client = new ListenHubClient({ baseURL })
    const result = await client.request<{ itemCount: number; items: number[] }>('GET', '/v1/things')
    expect(result.itemCount).toBe(3)
    expect(result.items).toEqual([1, 2, 3])
  })

  it('POST request sends body keys as-is', async () => {
    const client = new ListenHubClient({ baseURL })
    const result = await client.request<Record<string, unknown>>('POST', '/v1/echo', {
      body: { userName: 'alice', accountType: 'pro' },
    })
    // Server echoes body back, client camelizes response (no-op since already camelCase)
    expect(result).toEqual({ userName: 'alice', accountType: 'pro' })
  })

  it('204 No Content returns undefined', async () => {
    const client = new ListenHubClient({ baseURL })
    const result = await client.request('DELETE', '/v1/things/1')
    expect(result).toBeUndefined()
  })

  it('JSON API error', async () => {
    const client = new ListenHubClient({ baseURL })
    try {
      await client.request('GET', '/v1/error')
      expect.fail('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ListenHubError)
      expect((e as ListenHubError).code).toBe('40001')
      expect((e as ListenHubError).requestId).toBe('req_123')
    }
  })

  it('HTML gateway error', async () => {
    const client = new ListenHubClient({ baseURL })
    try {
      await client.request('GET', '/v1/gateway-error')
      expect.fail('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ListenHubError)
      expect((e as ListenHubError).code).toBe('GATEWAY_ERROR')
      expect((e as ListenHubError).message).toBe('502 Bad Gateway')
    }
  })

  it('429 retries and succeeds', async () => {
    const client = new ListenHubClient({ baseURL })
    const result = await client.request<{ ok: boolean }>('GET', '/v1/rate-limited')
    expect(result).toEqual({ ok: true })
  })

  it('401 auto-refresh and retry', async () => {
    const client = new ListenHubClient({
      baseURL,
      accessToken: 'expired_token',
      onTokenExpired: async () => 'valid_token',
    })
    const result = await client.request<{ user: string }>('GET', '/v1/protected')
    expect(result).toEqual({ user: 'test' })
  })

  it('onRequest and onResponse hooks fire', async () => {
    const requests: Request[] = []
    const responses: Response[] = []
    const client = new ListenHubClient({
      baseURL,
      onRequest: (req) => { requests.push(req) },
      onResponse: (res) => { responses.push(res) },
    })

    await client.request('GET', '/v1/things')

    expect(requests).toHaveLength(1)
    expect(responses).toHaveLength(1)
    expect(responses[0].status).toBe(200)
  })
})
