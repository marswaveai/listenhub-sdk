import ky, { type KyInstance } from 'ky'
import camelcaseKeys from 'camelcase-keys'
import decamelizeKeys from 'decamelize-keys'
import type { AuthResource } from './resources/auth/index'
import type { ClientOptions } from './types/client'
import type { PlatformAdapter } from './types/adapter'
import { ListenHubError, type RequestOptions } from './types/common'

const DEFAULT_BASE_URL = 'https://api.listenhub.ai/api'
const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RETRY_DELAY_MS = 1_000

async function parseErrorResponse(response: Response): Promise<ListenHubError> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const body = (await response.json()) as { code?: unknown; message?: string; request_id?: string }
      return new ListenHubError({
        status: response.status,
        code: String(body.code),
        message: body.message ?? `Error ${body.code}`,
        requestId: body.request_id,
      })
    } catch {
      // JSON parse failed, fall through
    }
  }

  if (contentType.includes('text/html')) {
    try {
      const html = await response.text()
      const title = html.match(/<title>(.*?)<\/title>/i)?.[1]
      return new ListenHubError({
        status: response.status,
        code: 'GATEWAY_ERROR',
        message: title ?? `HTTP ${response.status}`,
      })
    } catch {
      // text read failed, fall through
    }
  }

  return new ListenHubError({
    status: response.status,
    code: 'UNKNOWN_ERROR',
    message: response.statusText || `HTTP ${response.status}`,
  })
}

export class ListenHubClient {
  auth!: AuthResource
  readonly adapter?: PlatformAdapter

  private http: KyInstance
  private options: Required<Pick<ClientOptions, 'baseURL' | 'timeout' | 'maxRetries'>> & ClientOptions
  private accessToken: string | undefined
  private refreshPromise: Promise<string> | null = null

  constructor(options: ClientOptions = {}) {
    this.options = {
      baseURL: DEFAULT_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
      maxRetries: DEFAULT_MAX_RETRIES,
      ...options,
    }
    this.accessToken = options.accessToken
    this.adapter = options.adapter

    this.http = ky.create({
      prefixUrl: this.options.baseURL,
      timeout: this.options.timeout,
      throwHttpErrors: false,
      retry: 0,
      hooks: {
        beforeRequest: [
          async (request) => {
            if (this.accessToken) {
              request.headers.set('Authorization', `Bearer ${this.accessToken}`)
            }
            await this.options.onRequest?.(request)
          },
        ],
        afterResponse: [
          async (request, _options, response) => {
            await this.options.onResponse?.(response, request)
          },
        ],
      },
    })
  }

  _setAuth(auth: AuthResource) {
    this.auth = auth
  }

  setAccessToken(token: string) {
    this.accessToken = token
  }

  async request<T = unknown>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const kyOptions: Record<string, unknown> = {
      method,
      headers: { ...options.headers },
      signal: options.signal,
    }

    if (options.body !== undefined) {
      const body = options.rawKeys
        ? options.body
        : decamelizeKeys(options.body as Record<string, unknown> | Record<string, unknown>[], { deep: true })
      kyOptions.json = body
    }

    // Strip leading slash — ky prefixUrl requires it
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path

    const response = await this.http(normalizedPath, kyOptions)

    // 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    // 401 auto-refresh
    if (
      response.status === 401 &&
      !options.skipAutoRefresh &&
      this.options.onTokenExpired
    ) {
      const newToken = await this.handleTokenExpired()
      this.accessToken = newToken
      return this.request<T>(method, path, { ...options, skipAutoRefresh: true })
    }

    // 429 rate limit — retry with backoff
    const retryCount = options._retryCount ?? 0
    if (response.status === 429 && retryCount < this.options.maxRetries) {
      const delayMs = this.parseRetryAfter(response) ?? DEFAULT_RETRY_DELAY_MS * 2 ** retryCount
      await this.sleep(delayMs)
      return this.request<T>(method, path, { ...options, _retryCount: retryCount + 1 })
    }

    // Non-ok responses → error
    if (!response.ok) {
      throw await parseErrorResponse(response)
    }

    // Non-JSON success responses
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      return (await response.text()) as T
    }

    // JSON success — unwrap { code, message, data }
    const json = (await response.json()) as { code: number; message?: string; data: unknown; request_id?: string }

    if (json.code !== 0) {
      throw new ListenHubError({
        status: response.status,
        code: String(json.code),
        message: json.message ?? `Error ${json.code}`,
        requestId: json.request_id,
      })
    }

    if (options.rawKeys) {
      return json.data as T
    }

    return camelcaseKeys(json.data as Record<string, unknown>, { deep: true }) as T
  }

  private async handleTokenExpired(): Promise<string> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.options.onTokenExpired!().finally(() => {
        this.refreshPromise = null
      })
    }
    return this.refreshPromise
  }

  private parseRetryAfter(response: Response): number | null {
    const header = response.headers.get('retry-after')
    if (!header) return null
    const seconds = Number(header)
    if (!Number.isNaN(seconds)) return seconds * 1000
    const date = Date.parse(header)
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now())
    return null
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
