export interface ClientOptions {
  baseURL?: string
  accessToken?: string
  timeout?: number
  onTokenExpired?: () => Promise<string>
}
