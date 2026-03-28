import { describe, it, expect } from 'vitest'
import { ListenHubClient } from '../../src/index'
import { ListenHubError } from '../../src/types/common'

const API_URL = process.env.LISTENHUB_API_URL
const ACCESS_TOKEN = process.env.LISTENHUB_ACCESS_TOKEN

describe.skipIf(!API_URL)('E2E: Client basic requests', () => {
  it('reaches the API via public endpoint', async () => {
    const client = new ListenHubClient({ baseURL: API_URL })
    // TODO: replace /v1/health with actual public endpoint path
    const result = await client.request('GET', '/v1/health')
    expect(result).toBeDefined()
  })

  it('throws ListenHubError on invalid endpoint', async () => {
    const client = new ListenHubClient({ baseURL: API_URL })
    try {
      await client.request('GET', '/v1/this-endpoint-does-not-exist')
      expect.fail('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ListenHubError)
      expect((e as ListenHubError).status).toBeGreaterThanOrEqual(400)
    }
  })

  it('response keys are camelCased', async () => {
    const client = new ListenHubClient({ baseURL: API_URL })
    // TODO: replace with an endpoint that returns snake_case keys
    const result = await client.request<Record<string, unknown>>('GET', '/v1/health')
    // All top-level keys should be camelCase (no underscores)
    for (const key of Object.keys(result as object)) {
      expect(key).not.toMatch(/_[a-z]/)
    }
  })
})

describe.skipIf(!API_URL || !ACCESS_TOKEN)('E2E: Authenticated requests', () => {
  it('calls a protected endpoint with access token', async () => {
    const client = new ListenHubClient({
      baseURL: API_URL,
      accessToken: ACCESS_TOKEN,
    })
    // TODO: replace /v1/me with actual protected endpoint path
    const result = await client.request('GET', '/v1/me')
    expect(result).toBeDefined()
  })

  it('throws 401 without access token', async () => {
    const client = new ListenHubClient({ baseURL: API_URL })
    try {
      // TODO: replace /v1/me with actual protected endpoint path
      await client.request('GET', '/v1/me', { skipAutoRefresh: true })
      expect.fail('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ListenHubError)
      expect((e as ListenHubError).status).toBe(401)
    }
  })

  it('onRequest hook fires with real request', async () => {
    let capturedUrl = ''
    const client = new ListenHubClient({
      baseURL: API_URL,
      accessToken: ACCESS_TOKEN,
      onRequest: (req) => { capturedUrl = req.url },
    })
    // TODO: replace /v1/me with actual protected endpoint path
    await client.request('GET', '/v1/me')
    expect(capturedUrl).toContain('/v1/me')
  })

  it('onResponse hook fires with real response', async () => {
    let capturedStatus = 0
    const client = new ListenHubClient({
      baseURL: API_URL,
      accessToken: ACCESS_TOKEN,
      onResponse: (res) => { capturedStatus = res.status },
    })
    // TODO: replace /v1/me with actual protected endpoint path
    await client.request('GET', '/v1/me')
    expect(capturedStatus).toBe(200)
  })
})
