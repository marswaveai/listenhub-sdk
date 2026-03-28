import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

const mockFetch = vi.fn()

beforeEach(() => vi.stubGlobal('fetch', mockFetch))
afterEach(() => vi.restoreAllMocks())

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ code: 0, message: 'Success', data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('NodeCLIAdapter.auth.login', () => {
  it('orchestrates full login flow: server → init → browser → callback → token → save', async () => {
    const { ListenHubClient } = await import('../../../src/index')
    const { NodeCLIAdapter } = await import('../../../src/adapters/node/index')

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-login-test-'))
    const tokenPath = path.join(tmpDir, 'credentials.json')

    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/auth/cli/init')) {
        return jsonResponse({ sessionId: 'sess-1', authUrl: 'https://auth.test/cli?session_id=sess-1' })
      }
      if (url.includes('/auth/cli/token')) {
        return jsonResponse({ accessToken: 'at-new', refreshToken: 'rt-new', expiresIn: 2592000 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    // Use Node http.get (NOT fetch) to hit the local callback server, since global fetch is mocked
    const openBrowser = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50))
      const initCall = mockFetch.mock.calls.find(([u]: [string]) => u.includes('/auth/cli/init'))
      const body = JSON.parse(initCall[1].body)
      const port = body.callbackPort

      const nodeHttp = await import('node:http')
      await new Promise<void>((resolve, reject) => {
        nodeHttp.get(`http://127.0.0.1:${port}/callback?code=auth-code-123`, (res) => {
          res.resume()
          res.on('end', resolve)
        }).on('error', reject)
      })
    })

    const adapter = new NodeCLIAdapter({ tokenStorePath: tokenPath, openBrowser, loginTimeout: 5000 })
    const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
    const result = await adapter.auth.login(client.auth)

    expect(result.accessToken).toBe('at-new')
    expect(result.refreshToken).toBe('rt-new')
    expect(openBrowser).toHaveBeenCalledOnce()

    const saved = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'))
    expect(saved.accessToken).toBe('at-new')
    expect(saved.expiresAt).toBeGreaterThan(Date.now())

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

describe('loadCredentials', () => {
  it('returns credentials when file exists and token is valid', async () => {
    const { ListenHubClient } = await import('../../../src/index')
    const { loadCredentials } = await import('../../../src/adapters/node/index')

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-load-test-'))
    const tokenPath = path.join(tmpDir, 'credentials.json')
    const creds = { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3600_000 }
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true })
    fs.writeFileSync(tokenPath, JSON.stringify(creds))

    const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
    const result = await loadCredentials({ authAPI: client.auth, tokenStorePath: tokenPath })
    expect(result).toEqual(creds)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns null when no credentials file exists', async () => {
    const { ListenHubClient } = await import('../../../src/index')
    const { loadCredentials } = await import('../../../src/adapters/node/index')

    const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
    const result = await loadCredentials({
      authAPI: client.auth,
      tokenStorePath: '/tmp/nonexistent-sdk-test/credentials.json',
    })
    expect(result).toBeNull()
  })

  it('auto-refreshes when token is near expiry', async () => {
    const { ListenHubClient } = await import('../../../src/index')
    const { loadCredentials } = await import('../../../src/adapters/node/index')

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-refresh-test-'))
    const tokenPath = path.join(tmpDir, 'credentials.json')
    const creds = { accessToken: 'old-at', refreshToken: 'old-rt', expiresAt: Date.now() + 30_000 }
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true })
    fs.writeFileSync(tokenPath, JSON.stringify(creds))

    mockFetch.mockResolvedValueOnce(jsonResponse({
      accessToken: 'new-at', refreshToken: 'new-rt', expiresIn: 2592000,
    }))

    const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
    const result = await loadCredentials({ authAPI: client.auth, tokenStorePath: tokenPath })

    expect(result!.accessToken).toBe('new-at')
    expect(result!.refreshToken).toBe('new-rt')

    const saved = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'))
    expect(saved.accessToken).toBe('new-at')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

describe('NodeCLIAdapter.auth.logout', () => {
  it('revokes server token and deletes local file', async () => {
    const { ListenHubClient } = await import('../../../src/index')
    const { NodeCLIAdapter } = await import('../../../src/adapters/node/index')

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-logout-test-'))
    const tokenPath = path.join(tmpDir, 'credentials.json')
    const creds = { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3600_000 }
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true })
    fs.writeFileSync(tokenPath, JSON.stringify(creds))

    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))

    const adapter = new NodeCLIAdapter({ tokenStorePath: tokenPath })
    const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
    await adapter.auth.logout(client.auth)

    expect(fs.existsSync(tokenPath)).toBe(false)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('clears local file even when server revocation fails', async () => {
    const { ListenHubClient } = await import('../../../src/index')
    const { NodeCLIAdapter } = await import('../../../src/adapters/node/index')

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-logout-fail-'))
    const tokenPath = path.join(tmpDir, 'credentials.json')
    const creds = { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3600_000 }
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true })
    fs.writeFileSync(tokenPath, JSON.stringify(creds))

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const adapter = new NodeCLIAdapter({ tokenStorePath: tokenPath })
    const client = new ListenHubClient({ baseURL: 'https://api.test.com/api' })
    await adapter.auth.logout(client.auth)

    expect(fs.existsSync(tokenPath)).toBe(false)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
