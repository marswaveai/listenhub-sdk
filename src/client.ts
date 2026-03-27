import type { AuthResource } from './resources/auth/index'
import type { ClientOptions } from './types/client'
import { ListenHubError, type RequestOptions } from './types/common'

const DEFAULT_BASE_URL = 'https://api.listenhub.ai/api'
const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RETRY_DELAY_MS = 1_000

export class ListenHubClient {
  auth!: AuthResource

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
    const url = `${this.options.baseURL}${path}`
    const headers: Record<string, string> = { ...options.headers }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal ?? controller.signal,
      })

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

      // Non-JSON responses
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        if (!response.ok) {
          throw new ListenHubError({
            status: response.status,
            code: 'UNKNOWN',
            message: response.statusText || `HTTP ${response.status}`,
          })
        }
        return (await response.clone().text()) as T
      }

      // JSON responses — unwrap { code, message, data }
      const json = await response.clone().json()

      if (json.code !== 0) {
        throw new ListenHubError({
          status: response.status,
          code: String(json.code),
          message: json.message ?? `Error ${json.code}`,
          requestId: json.requestId,
        })
      }

      return json.data as T
    } finally {
      clearTimeout(timeoutId)
    }
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
