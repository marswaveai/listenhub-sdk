import * as http from 'node:http'
import * as url from 'node:url'
import type { ListenHubClient } from '../../client'
import type { ClientOptions } from '../../types/client'
import type { TokenResponse, StoredCredentials, LogoutResult } from '../../types/auth'
import { ListenHubError } from '../../types/common'
import {
  readCredentials,
  writeCredentials,
  deleteCredentials,
  DEFAULT_TOKEN_STORE_PATH,
} from './credentials'

export type { StoredCredentials, LogoutResult }

const REFRESH_BUFFER_MS = 60_000

interface CliLoginOptions {
  client: ListenHubClient
  port?: number
  tokenStorePath?: string
  openBrowser?: (url: string) => Promise<void>
  timeout?: number
}

export async function cliLogin(options: CliLoginOptions): Promise<TokenResponse> {
  const {
    client,
    tokenStorePath = DEFAULT_TOKEN_STORE_PATH,
    timeout = 300_000,
  } = options

  const openBrowser = options.openBrowser ?? defaultOpenBrowser

  const { server, port, waitForCode } = await startCallbackServer(timeout)

  try {
    const { sessionId, authUrl } = await client.auth.cliInit({ callbackPort: port })
    await openBrowser(authUrl)
    const code = await waitForCode
    const tokens = await client.auth.cliToken({ sessionId, code })

    const credentials: StoredCredentials = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    }
    await writeCredentials(tokenStorePath, credentials)

    return tokens
  } finally {
    server.close()
  }
}

export async function loadCredentials(options: {
  client: ListenHubClient
  tokenStorePath?: string
}): Promise<StoredCredentials | null> {
  const { client, tokenStorePath = DEFAULT_TOKEN_STORE_PATH } = options

  const creds = await readCredentials(tokenStorePath)
  if (!creds) return null

  if (creds.expiresAt - REFRESH_BUFFER_MS < Date.now()) {
    try {
      const tokens = await client.auth.refresh({ refreshToken: creds.refreshToken })
      const updated: StoredCredentials = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
      }
      await writeCredentials(tokenStorePath, updated)
      return updated
    } catch {
      return null
    }
  }

  return creds
}

export async function createAuthenticatedClient(options?: {
  tokenStorePath?: string
  clientOptions?: ClientOptions
}): Promise<ListenHubClient> {
  const tokenStorePath = options?.tokenStorePath ?? DEFAULT_TOKEN_STORE_PATH

  const { ListenHubClient } = await import('../../index')

  const tmpClient = new ListenHubClient(options?.clientOptions)
  const creds = await loadCredentials({ client: tmpClient, tokenStorePath })
  if (!creds) {
    throw new ListenHubError({
      status: 0,
      code: 'NOT_AUTHENTICATED',
      message: 'No stored credentials found. Run cliLogin() first.',
    })
  }

  const client: ListenHubClient = new ListenHubClient({
    ...options?.clientOptions,
    accessToken: creds.accessToken,
    onTokenExpired: async () => {
      const current = await readCredentials(tokenStorePath)
      if (!current) {
        throw new ListenHubError({
          status: 0,
          code: 'NOT_AUTHENTICATED',
          message: 'Credentials file missing during token refresh.',
        })
      }
      const tokens = await client.auth.refresh({
        refreshToken: current.refreshToken,
      })
      const updated: StoredCredentials = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
      }
      await writeCredentials(tokenStorePath, updated)
      return tokens.accessToken
    },
  })

  return client
}

export async function cliLogout(options: {
  client: ListenHubClient
  tokenStorePath?: string
}): Promise<LogoutResult> {
  const { client, tokenStorePath = DEFAULT_TOKEN_STORE_PATH } = options
  const result: LogoutResult = { serverRevoked: false, localCleared: false }

  const creds = await readCredentials(tokenStorePath)

  if (creds) {
    try {
      await client.auth.revoke({ refreshToken: creds.refreshToken })
      result.serverRevoked = true
    } catch (err) {
      result.warning = `Server token revocation failed: ${(err as Error).message}. Token may still be valid on server.`
    }
  }

  await deleteCredentials(tokenStorePath)
  result.localCleared = true

  return result
}

async function defaultOpenBrowser(targetUrl: string): Promise<void> {
  const open = (await import('open')).default
  await open(targetUrl)
}

function startCallbackServer(timeout: number): Promise<{
  server: http.Server
  port: number
  waitForCode: Promise<string>
}> {
  return new Promise((resolveSetup) => {
    let resolveCode: (code: string) => void
    let rejectCode: (err: Error) => void

    const waitForCode = new Promise<string>((resolve, reject) => {
      resolveCode = resolve
      rejectCode = reject
    })

    const server = http.createServer((req, res) => {
      const parsed = url.parse(req.url ?? '', true)

      if (req.method === 'GET' && parsed.pathname === '/callback') {
        const code = parsed.query.code as string | undefined
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><h1>Login successful</h1><p>You can close this tab.</p></body></html>')
          resolveCode(code)
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Missing code parameter')
        }
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    const timer = setTimeout(() => {
      server.close()
      rejectCode(new ListenHubError({
        status: 0,
        code: 'LOGIN_TIMEOUT',
        message: `Login timed out after ${timeout / 1000}s. Please try again.`,
      }))
    }, timeout)

    waitForCode.then(() => clearTimeout(timer)).catch(() => clearTimeout(timer))

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolveSetup({ server, port, waitForCode })
    })
  })
}
