export interface ClientOptions {
  baseURL?: string
  accessToken?: string
  timeout?: number
  /** Max retries on 429 rate limit responses. Default: 2. Set 0 to disable. */
  maxRetries?: number
  onTokenExpired?: () => Promise<string>
}
