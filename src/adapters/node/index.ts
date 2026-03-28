import * as http from 'node:http'
import * as url from 'node:url'
import type { AuthAPI, AuthStrategy, StorageProvider, PlatformAdapter } from '../../types/adapter'
import type { TokenResponse, StoredCredentials } from '../../types/auth'
import type { ClientOptions } from '../../types/client'
import { ListenHubError } from '../../types/common'
import {
  readCredentials,
  writeCredentials,
  deleteCredentials,
  DEFAULT_TOKEN_STORE_PATH,
} from './credentials'

export type { StoredCredentials }

const REFRESH_BUFFER_MS = 60_000

export interface NodeCLIAdapterOptions {
  tokenStorePath?: string
  openBrowser?: (url: string) => Promise<void>
  loginTimeout?: number
}

class NodeCLIAuthStrategy implements AuthStrategy {
  constructor(
    private storage: NodeCLIStorageProvider,
    private openBrowser: (url: string) => Promise<void>,
    private loginTimeout: number,
  ) {}

  async login(authAPI: AuthAPI): Promise<TokenResponse> {
    const { server, port, waitForCode } = await startCallbackServer(this.loginTimeout)

    try {
      const { authUrl, sessionId } = await authAPI.cliInit({ callbackPort: port })
      await this.openBrowser(authUrl)
      const code = await waitForCode
      const tokens = await authAPI.cliToken({ sessionId, code })

      const credentials: StoredCredentials = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
      }
      await this.storage.save(credentials)

      return tokens
    } finally {
      server.close()
    }
  }

  async logout(authAPI: AuthAPI): Promise<void> {
    const creds = await this.storage.load()
    if (creds) {
      try {
        await authAPI.revoke({ refreshToken: creds.refreshToken })
      } catch {
        // Best-effort server revocation
      }
    }
    await this.storage.clear()
  }
}

class NodeCLIStorageProvider implements StorageProvider {
  constructor(private tokenStorePath: string) {}

  async load(): Promise<StoredCredentials | null> {
    return readCredentials(this.tokenStorePath)
  }

  async save(credentials: StoredCredentials): Promise<void> {
    await writeCredentials(this.tokenStorePath, credentials)
  }

  async clear(): Promise<void> {
    await deleteCredentials(this.tokenStorePath)
  }
}

export class NodeCLIAdapter implements PlatformAdapter {
  auth: AuthStrategy
  storage: StorageProvider

  constructor(options: NodeCLIAdapterOptions = {}) {
    const tokenStorePath = options.tokenStorePath ?? DEFAULT_TOKEN_STORE_PATH
    const openBrowser = options.openBrowser ?? defaultOpenBrowser
    const loginTimeout = options.loginTimeout ?? 300_000

    const storage = new NodeCLIStorageProvider(tokenStorePath)
    this.storage = storage
    this.auth = new NodeCLIAuthStrategy(storage, openBrowser, loginTimeout)
  }
}

// --- Convenience functions (preserve v1 API surface) ---

export async function loadCredentials(options: {
  authAPI: AuthAPI
  tokenStorePath?: string
}): Promise<StoredCredentials | null> {
  const { authAPI, tokenStorePath = DEFAULT_TOKEN_STORE_PATH } = options

  const creds = await readCredentials(tokenStorePath)
  if (!creds) return null

  if (creds.expiresAt - REFRESH_BUFFER_MS < Date.now()) {
    try {
      const tokens = await authAPI.refresh({ refreshToken: creds.refreshToken })
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createAuthenticatedClient(options?: {
  tokenStorePath?: string
  clientOptions?: ClientOptions
}): Promise<{ client: any; adapter: NodeCLIAdapter }> {
  const tokenStorePath = options?.tokenStorePath ?? DEFAULT_TOKEN_STORE_PATH
  const adapter = new NodeCLIAdapter({ tokenStorePath })

  const { ListenHubClient } = await import('../../index')

  const tmpClient = new ListenHubClient(options?.clientOptions)
  const creds = await loadCredentials({ authAPI: tmpClient.auth, tokenStorePath })
  if (!creds) {
    throw new ListenHubError({
      status: 0,
      code: 'NOT_AUTHENTICATED',
      message: 'No stored credentials found. Run login() first.',
    })
  }

  // Use a ref object so onTokenExpired can reference the client after construction
  const ref: { client: InstanceType<typeof ListenHubClient> | null } = { client: null }

  const client = new ListenHubClient({
    ...options?.clientOptions,
    accessToken: creds.accessToken,
    adapter,
    onTokenExpired: async (): Promise<string> => {
      const current = await readCredentials(tokenStorePath)
      if (!current) {
        throw new ListenHubError({
          status: 0,
          code: 'NOT_AUTHENTICATED',
          message: 'Credentials file missing during token refresh.',
        })
      }
      const tokens: TokenResponse = await ref.client!.auth.refresh({ refreshToken: current.refreshToken })
      const updated: StoredCredentials = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
      }
      await writeCredentials(tokenStorePath, updated)
      return tokens.accessToken
    },
  })
  ref.client = client

  return { client, adapter }
}

// --- Internal helpers ---

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
