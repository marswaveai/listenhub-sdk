import type { PlatformAdapter } from './adapter'

export interface ClientOptions {
  baseURL?: string
  accessToken?: string
  timeout?: number
  /** Max retries on 429 rate limit responses. Default: 2. Set 0 to disable. */
  maxRetries?: number
  onTokenExpired?: () => Promise<string>
  adapter?: PlatformAdapter
  onRequest?: (request: Request) => void | Promise<void>
  onResponse?: (response: Response, request: Request) => void | Promise<void>
}
