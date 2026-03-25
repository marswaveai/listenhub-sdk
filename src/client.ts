import type { AuthResource } from './resources/auth/index'
import type { ClientOptions } from './types/client'
import { ListenHubError, type RequestOptions } from './types/common'

const DEFAULT_BASE_URL = 'https://api.listenhub.ai/api'
const DEFAULT_TIMEOUT = 30_000

export class ListenHubClient {
  auth!: AuthResource

  private options: Required<Pick<ClientOptions, 'baseURL' | 'timeout'>> & ClientOptions
  private accessToken: string | undefined
  private refreshPromise: Promise<string> | null = null

  constructor(options: ClientOptions = {}) {
    this.options = {
      baseURL: DEFAULT_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
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
}
